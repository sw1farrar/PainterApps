import "server-only";

import {
  computeEnrichmentStatus,
  toEnrichmentStatusInput,
} from "@/lib/product-catalog/enrichment-status";
import { normalizeProductRow } from "@/lib/product-catalog/normalize-product";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import {
  getPlatformPaintCanImagePublicUrl,
  isPlatformPaintCanStoragePath,
  platformPaintCanImageStoragePath,
  validatePlatformPaintCanImageFile,
} from "@/lib/storage/platform-paint-can-image";

async function removePlatformPaintCanImageFile(
  storagePath: string | null | undefined,
): Promise<void> {
  if (!isPlatformPaintCanStoragePath(storagePath)) return;

  const admin = createAdminClient();
  await admin.storage
    .from(STORAGE_BUCKETS.productCatalogAssets)
    .remove([storagePath!]);
}

export async function persistPlatformPaintCanImageUpload(input: {
  paintProductId: string;
  file: File;
}): Promise<
  | { success: true; url: string; storagePath: string; updatedAt: string }
  | { success: false; error: string }
> {
  const paintProductId = input.paintProductId.trim();
  if (!paintProductId) {
    return { success: false, error: "Product id is required." };
  }

  const validationError = validatePlatformPaintCanImageFile(input.file);
  if (validationError) return { success: false, error: validationError };

  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("paint_products")
    .select("*")
    .eq("id", paintProductId)
    .maybeSingle();

  if (existingError || !existing) {
    return { success: false, error: "Product not found." };
  }

  const previousStoragePath =
    typeof existing.can_image_storage_path === "string"
      ? existing.can_image_storage_path
      : null;

  const path = platformPaintCanImageStoragePath(paintProductId, input.file);
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKETS.productCatalogAssets)
    .upload(path, buffer, { upsert: true, contentType: input.file.type });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const url = getPlatformPaintCanImagePublicUrl(path);
  const updatedAt = new Date().toISOString();
  const normalized = normalizeProductRow(existing);

  const enrichmentStatus = computeEnrichmentStatus(
    toEnrichmentStatusInput({
      ...normalized,
      can_image_url: url,
    }),
  );

  const { error: updateError } = await admin
    .from("paint_products")
    .update({
      can_image_url: url,
      can_image_storage_path: path,
      enrichment_status: enrichmentStatus,
      updated_at: updatedAt,
    })
    .eq("id", paintProductId);

  if (updateError) {
    await admin.storage.from(STORAGE_BUCKETS.productCatalogAssets).remove([path]);
    return { success: false, error: updateError.message };
  }

  if (previousStoragePath && previousStoragePath !== path) {
    await removePlatformPaintCanImageFile(previousStoragePath);
  }

  return {
    success: true,
    url,
    storagePath: path,
    updatedAt,
  };
}
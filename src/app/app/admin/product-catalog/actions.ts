"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/app/app/admin/types";
import { requireSiteAdmin } from "@/lib/auth/session";
import {
  computeEnrichmentStatus,
  toEnrichmentStatusInput,
} from "@/lib/product-catalog/enrichment-status";
import {
  ensurePaintProductSchema,
  requirePaintProductSchema,
} from "@/lib/product-catalog/ensure-schema";
import { loadCatalogProduct } from "@/lib/product-catalog/load-catalog-product";
import { normalizeManufacturerRow } from "@/lib/product-catalog/normalize-manufacturer";
import { normalizeProductRow } from "@/lib/product-catalog/normalize-product";
import { mergeApplicationScope } from "@/lib/product-catalog/product-attributes";
import { resolveMarketingSheetPdfImageDataUrls } from "@/lib/product-catalog/product-marketing-sheet-pdf-assets";
import {
  toCatalogProductRow,
  type CatalogProductRow,
  type PaintManufacturerRow,
  type PaintProductApplication,
  type PaintProductRow,
} from "@/lib/product-catalog/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";

async function assertSiteAdmin() {
  return requireSiteAdmin();
}

function mergeCatalogApplicationScopes(
  scopes: PaintProductApplication[],
): PaintProductApplication {
  if (scopes.length === 0) return "interior";
  return scopes.reduce(
    (merged, scope) => mergeApplicationScope(merged, scope),
    scopes[0]!,
  );
}

export async function listProductCatalog(): Promise<{
  manufacturers: PaintManufacturerRow[];
  products: CatalogProductRow[];
}> {
  await assertSiteAdmin();
  await ensurePaintProductSchema();
  const admin = createAdminClient();

  const [{ data: manufacturers }, { data: products }] = await Promise.all([
    admin
      .from("paint_manufacturers")
      .select("*")
      .order("name", { ascending: true }),
    admin
      .from("paint_products")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const manufacturerRows =
    manufacturers?.map((row) => normalizeManufacturerRow(row)) ?? [];
  const manufacturerById = new Map(
    manufacturerRows.map((row) => [row.id, row]),
  );

  const productRows =
    products?.map((row) => {
      const manufacturer = manufacturerById.get(row.manufacturer_id as string);
      return toCatalogProductRow(
        normalizeProductRow(row),
        manufacturer ?? { name: "Unknown", logo_url: null },
      );
    }) ?? [];

  return {
    manufacturers: manufacturerRows,
    products: productRows,
  };
}

export async function loadMarketingSheetPdfAssets(
  productId: string,
): Promise<
  ActionResult<{
    canImageDataUrl: string | null;
    manufacturerLogoDataUrl: string | null;
  }>
> {
  await assertSiteAdmin();

  const result = await resolveMarketingSheetPdfImageDataUrls(productId);
  if ("error" in result) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result };
}

export type { CatalogProductRow } from "@/lib/product-catalog/types";

export type UpdatePaintProductInput = {
  id: string;
  manufacturer_id: string;
  name: string;
  application_type: PaintProductRow["application_type"];
  category: PaintProductRow["category"];
  resin_type: string | null;
  base_type: PaintProductRow["base_type"];
  source_url: string | null;
  enrichment_source_url: string | null;
  product_description: string | null;
  sheen_options: string[];
  paint_system_features: string[];
  paint_system_feature_options: string[];
  can_image_url: string | null;
  is_discontinued: boolean;
};

export async function updatePaintProduct(
  input: UpdatePaintProductInput,
): Promise<ActionResult<{ product: CatalogProductRow }>> {
  await assertSiteAdmin();
  await requirePaintProductSchema();

  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "Product name is required." };
  }

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("paint_products")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (existingError || !existing) {
    return { success: false, error: "Product not found." };
  }

  const existingProduct = normalizeProductRow(existing);
  const canImageUrl = input.can_image_url?.trim() || null;
  const canImageStoragePath =
    canImageUrl && canImageUrl === existingProduct.can_image_url
      ? existingProduct.can_image_storage_path
      : canImageUrl
        ? null
        : null;

  const { data: siblingRows, error: siblingError } = await admin
    .from("paint_products")
    .select("id, application_type")
    .eq("manufacturer_id", input.manufacturer_id)
    .eq("name", name)
    .eq("category", input.category)
    .neq("id", input.id);

  if (siblingError) {
    return { success: false, error: siblingError.message };
  }

  const mergedApplicationType = mergeCatalogApplicationScopes([
    input.application_type,
    existingProduct.application_type,
    ...(siblingRows ?? []).map(
      (row) => row.application_type as PaintProductApplication,
    ),
  ]);

  const duplicateSiblingIds = (siblingRows ?? []).map((row) => row.id as string);

  const enrichmentStatus = computeEnrichmentStatus(
    toEnrichmentStatusInput({
      ...existingProduct,
      can_image_url: canImageUrl,
      resin_type: input.resin_type,
      base_type: input.base_type,
      product_description: input.product_description,
      sheen_options: input.sheen_options,
      paint_system_feature_options: input.paint_system_feature_options,
    }),
  );

  const { error: updateError } = await admin
    .from("paint_products")
    .update({
      manufacturer_id: input.manufacturer_id,
      name,
      application_type: mergedApplicationType,
      category: input.category,
      resin_type: input.resin_type,
      base_type: input.base_type,
      source_url: input.source_url,
      enrichment_source_url: input.enrichment_source_url,
      product_description: input.product_description,
      sheen_options: input.sheen_options,
      paint_system_features: input.paint_system_features,
      paint_system_feature_options: input.paint_system_feature_options,
      can_image_url: canImageUrl,
      can_image_storage_path: canImageStoragePath,
      is_discontinued: input.is_discontinued,
      enrichment_status: enrichmentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (duplicateSiblingIds.length > 0) {
    const { error: dedupeError } = await admin
      .from("paint_products")
      .delete()
      .in("id", duplicateSiblingIds);

    if (dedupeError) {
      return {
        success: false,
        error: `Product updated but duplicate rows could not be merged: ${dedupeError.message}`,
      };
    }
  }

  const product = await loadCatalogProduct(input.id);
  if ("error" in product) {
    return { success: false, error: product.error };
  }

  revalidatePath("/app/admin/product-catalog");
  return { success: true, data: { product } };
}

export async function setPaintProductDiscontinued(input: {
  productId: string;
  isDiscontinued: boolean;
}): Promise<ActionResult<{ product: CatalogProductRow }>> {
  await assertSiteAdmin();
  await requirePaintProductSchema();

  const admin = createAdminClient();
  const { error } = await admin
    .from("paint_products")
    .update({
      is_discontinued: input.isDiscontinued,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.productId);

  if (error) {
    return { success: false, error: error.message };
  }

  const product = await loadCatalogProduct(input.productId);
  if ("error" in product) {
    return { success: false, error: product.error };
  }

  revalidatePath("/app/admin/product-catalog");
  return { success: true, data: { product } };
}

export async function deletePaintProduct(
  productId: string,
): Promise<ActionResult> {
  await assertSiteAdmin();
  const admin = createAdminClient();

  const { data: product } = await admin
    .from("paint_products")
    .select("can_image_storage_path")
    .eq("id", productId)
    .maybeSingle();

  const { error } = await admin
    .from("paint_products")
    .delete()
    .eq("id", productId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (product?.can_image_storage_path) {
    await admin.storage
      .from(STORAGE_BUCKETS.productCatalogAssets)
      .remove([product.can_image_storage_path]);
  }

  revalidatePath("/app/admin/product-catalog");
  return { success: true };
}
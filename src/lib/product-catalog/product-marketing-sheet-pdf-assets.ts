import { loadCatalogProduct } from "@/lib/product-catalog/load-catalog-product";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAbsoluteHttpUrl } from "@/lib/utils";

const PDF_WHITE_BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 } as const;

function bufferToDataUrl(buffer: Buffer, mime: string): string {
  const normalizedMime = mime.split(";")[0]?.trim() || "image/jpeg";
  return `data:${normalizedMime};base64,${buffer.toString("base64")}`;
}

/**
 * react-pdf only embeds JPEG/PNG reliably. Transparent WebP/PNG areas must be
 * flattened onto white — otherwise JPEG export turns alpha into black.
 */
async function normalizeImageBufferForPdf(
  buffer: Buffer,
  mime: string,
): Promise<{ buffer: Buffer; mime: string }> {
  const normalizedMime = mime.split(";")[0]?.trim().toLowerCase() || "image/jpeg";

  try {
    const sharp = (await import("sharp")).default;
    const metadata = await sharp(buffer).metadata();
    const hasAlpha = Boolean(metadata.hasAlpha);
    const needsConversion =
      normalizedMime !== "image/jpeg" && normalizedMime !== "image/png";

    if (!hasAlpha && !needsConversion) {
      return { buffer, mime: normalizedMime };
    }

    const pipeline = sharp(buffer).flatten({ background: PDF_WHITE_BACKGROUND });

    if (needsConversion || hasAlpha) {
      const converted = await pipeline.jpeg({ quality: 90 }).toBuffer();
      return { buffer: converted, mime: "image/jpeg" };
    }

    const converted = await pipeline.png().toBuffer();
    return { buffer: converted, mime: "image/png" };
  } catch {
    return { buffer, mime: normalizedMime };
  }
}

async function downloadStoragePathAsDataUrl(
  storagePath: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKETS.productCatalogAssets)
    .download(storagePath);

  if (error || !data) return null;

  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.length === 0) return null;

  const normalized = await normalizeImageBufferForPdf(
    buffer,
    data.type || "image/jpeg",
  );
  return bufferToDataUrl(normalized.buffer, normalized.mime);
}

async function fetchHttpImageAsDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!isAbsoluteHttpUrl(url)) return null;

  try {
    const response = await fetch(url!.trim(), {
      headers: { Accept: "image/*" },
    });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) return null;

    const mime =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/jpeg";
    const normalized = await normalizeImageBufferForPdf(buffer, mime);
    return bufferToDataUrl(normalized.buffer, normalized.mime);
  } catch {
    return null;
  }
}

async function resolveImageDataUrl(input: {
  storagePath: string | null;
  publicUrl: string | null;
}): Promise<string | null> {
  if (input.storagePath) {
    const fromStorage = await downloadStoragePathAsDataUrl(input.storagePath);
    if (fromStorage) return fromStorage;
  }

  return fetchHttpImageAsDataUrl(input.publicUrl);
}

export async function resolveMarketingSheetPdfImageDataUrls(productId: string): Promise<
  | {
      canImageDataUrl: string | null;
      manufacturerLogoDataUrl: string | null;
    }
  | { error: string }
> {
  const product = await loadCatalogProduct(productId);
  if ("error" in product) {
    return { error: product.error };
  }

  const admin = createAdminClient();
  const { data: manufacturer } = await admin
    .from("paint_manufacturers")
    .select("logo_url, logo_storage_path")
    .eq("id", product.manufacturer_id)
    .maybeSingle();

  const [canImageDataUrl, manufacturerLogoDataUrl] = await Promise.all([
    resolveImageDataUrl({
      storagePath: product.can_image_storage_path,
      publicUrl: product.can_image_url,
    }),
    resolveImageDataUrl({
      storagePath:
        typeof manufacturer?.logo_storage_path === "string"
          ? manufacturer.logo_storage_path
          : null,
      publicUrl:
        typeof manufacturer?.logo_url === "string" ? manufacturer.logo_url : null,
    }),
  ]);

  return { canImageDataUrl, manufacturerLogoDataUrl };
}

export function isPdfEmbeddedImageSrc(
  value: string | null | undefined,
): value is string {
  if (!value?.trim()) return false;
  if (value.startsWith("data:image/")) return true;
  return isAbsoluteHttpUrl(value);
}
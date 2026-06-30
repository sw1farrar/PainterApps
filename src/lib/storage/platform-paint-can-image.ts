import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import { fileExtension, validateImageFile } from "@/lib/storage/validate";

const PLATFORM_PAINT_CAN_PREFIX = "platform-products";

export function platformPaintCanImageStoragePath(
  paintProductId: string,
  file: File,
): string {
  return `${PLATFORM_PAINT_CAN_PREFIX}/${paintProductId}/${crypto.randomUUID()}.${fileExtension(file)}`;
}

export function isPlatformPaintCanStoragePath(
  storagePath: string | null | undefined,
): boolean {
  if (!storagePath?.trim()) return false;
  return storagePath.startsWith(`${PLATFORM_PAINT_CAN_PREFIX}/`);
}

export function validatePlatformPaintCanImageFile(file: File): string | null {
  return validateImageFile(file);
}

export function getPlatformPaintCanImagePublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/${STORAGE_BUCKETS.productCatalogAssets}/${storagePath}`;
}
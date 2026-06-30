import { STORAGE_BUCKETS } from "@/lib/storage/constants";

export type PlatformCanImageFields = {
  can_image_url?: string | null;
  can_image_storage_path?: string | null;
};

/** Prefer stored public URL; fall back to Supabase storage path for enriched catalog products. */
export function resolvePlatformCanImageUrl(
  supabaseUrl: string | null | undefined,
  platform: PlatformCanImageFields | null | undefined,
): string | null {
  if (!platform) return null;

  const direct = platform.can_image_url?.trim();
  if (direct) return direct;

  const path = platform.can_image_storage_path?.trim();
  if (!path || !supabaseUrl?.trim()) return null;

  const base = supabaseUrl.trim().replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${STORAGE_BUCKETS.productCatalogAssets}/${path}`;
}
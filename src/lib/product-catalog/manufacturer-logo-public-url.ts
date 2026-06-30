import { STORAGE_BUCKETS } from "@/lib/storage/constants";

export type ManufacturerLogoFields = {
  logo_url?: string | null;
  logo_storage_path?: string | null;
};

/** Public URL for web preview — prefers logo_url, then Supabase storage path. */
export function resolveManufacturerLogoPublicUrl(
  supabaseUrl: string | null | undefined,
  manufacturer: ManufacturerLogoFields | null | undefined,
): string | null {
  if (!manufacturer) return null;

  const direct = manufacturer.logo_url?.trim();
  if (direct) return direct;

  const path = manufacturer.logo_storage_path?.trim();
  if (!path || !supabaseUrl?.trim()) return null;

  const base = supabaseUrl.trim().replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${STORAGE_BUCKETS.productCatalogAssets}/${path}`;
}
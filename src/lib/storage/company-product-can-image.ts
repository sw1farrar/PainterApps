import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import { fileExtension, validateImageFile } from "@/lib/storage/validate";

const COMPANY_PRODUCT_CAN_PREFIX = "company-products";

export function companyProductCanImageStoragePath(
  companyId: string,
  productId: string | null | undefined,
  file: File,
): string {
  const folder = productId?.trim() || "drafts";
  return `${companyId}/${COMPANY_PRODUCT_CAN_PREFIX}/${folder}/${crypto.randomUUID()}.${fileExtension(file)}`;
}

export function isCompanyProductCanStoragePath(
  companyId: string,
  storagePath: string | null | undefined,
): boolean {
  if (!storagePath?.trim()) return false;
  return storagePath.startsWith(`${companyId}/${COMPANY_PRODUCT_CAN_PREFIX}/`);
}

export function validateCompanyProductCanImageFile(
  file: File,
): string | null {
  return validateImageFile(file);
}

export function getCompanyProductCanImagePublicUrl(
  storagePath: string,
): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/${STORAGE_BUCKETS.productCatalogAssets}/${storagePath}`;
}
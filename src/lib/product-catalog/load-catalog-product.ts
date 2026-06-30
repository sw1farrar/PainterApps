import { normalizeManufacturerRow } from "@/lib/product-catalog/normalize-manufacturer";
import { normalizeProductRow } from "@/lib/product-catalog/normalize-product";
import {
  toCatalogProductRow,
  type CatalogProductRow,
} from "@/lib/product-catalog/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loadCatalogProduct(
  productId: string,
): Promise<CatalogProductRow | { error: string }> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("paint_products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error || !row) {
    return { error: error?.message ?? "Product not found." };
  }

  const { data: manufacturer } = await admin
    .from("paint_manufacturers")
    .select("*")
    .eq("id", row.manufacturer_id)
    .maybeSingle();

  const manufacturerRow = manufacturer
    ? normalizeManufacturerRow(manufacturer)
    : null;

  return toCatalogProductRow(
    normalizeProductRow(row),
    manufacturerRow ?? {
      name: "Unknown",
      logo_url: null,
      logo_storage_path: null,
    },
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}
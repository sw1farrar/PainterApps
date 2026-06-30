import { createAdminClient } from "@/lib/supabase/admin";

export async function isCompanyPaintProductAttributesReady(): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("company_paint_products")
    .select("base_type, resin_type, can_image_url")
    .limit(1);

  return !error;
}

export async function isUnifiedCatalogColumnsReady(): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("paint_products")
    .select("catalog_origin, catalog_review_status")
    .limit(1);

  return !error;
}

export async function isPaintProductDiscontinuedColumnReady(): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("paint_products")
    .select("is_discontinued")
    .limit(1);

  return !error;
}
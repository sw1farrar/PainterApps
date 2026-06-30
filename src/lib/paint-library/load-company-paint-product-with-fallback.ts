import {
  COMPANY_PAINT_PRODUCT_SELECT,
  mapCompanyPaintProduct,
} from "@/lib/paint-library/map-company-paint-product";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import type { CatalogProductRow } from "@/lib/product-catalog/types";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function buildPlatformJoinFallback(
  catalog: CatalogProductRow,
): Record<string, unknown> {
  return {
    id: catalog.id,
    name: catalog.name,
    application_type: catalog.application_type,
    resin_type: catalog.resin_type,
    resin_system: catalog.resin_system,
    base_type: catalog.base_type,
    voc_level: catalog.voc_level,
    product_description: catalog.product_description,
    source_url: catalog.source_url,
    attribute_source_url: catalog.attribute_source_url,
    sheen_options: catalog.sheen_options,
    paint_system_features: catalog.paint_system_features,
    paint_system_feature_options: catalog.paint_system_feature_options,
    product_uses: catalog.product_uses,
    substrates: catalog.substrates,
    recommended_uses: catalog.recommended_uses,
    volume_solids_pct: catalog.volume_solids_pct,
    volume_solids_label: catalog.volume_solids_label,
    can_image_url: catalog.can_image_url,
    can_image_storage_path: catalog.can_image_storage_path,
    is_self_priming: catalog.is_self_priming,
    is_stain_blocking: catalog.is_stain_blocking,
    is_mold_mildew_resistant: catalog.is_mold_mildew_resistant,
    is_scrubbable: catalog.is_scrubbable,
    is_one_coat: catalog.is_one_coat,
    catalog_origin: catalog.catalog_origin,
    catalog_review_status: catalog.catalog_review_status,
    updated_at: catalog.updated_at,
    paint_manufacturers: catalog.manufacturer_name
      ? { name: catalog.manufacturer_name }
      : null,
  };
}

export async function loadCompanyPaintProductRowWithFallback(input: {
  supabase: SupabaseServerClient;
  companyId: string;
  bookmarkId: string;
  catalogFallback?: CatalogProductRow;
  minimalFallback?: {
    paintProductId: string;
    name: string;
    manufacturerName?: string | null;
    applicationType?: string;
  };
}): Promise<CompanyPaintProductRow> {
  const { data, error } = await input.supabase
    .from("company_paint_products")
    .select(COMPANY_PAINT_PRODUCT_SELECT)
    .eq("id", input.bookmarkId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (!error && data) {
    const mapped = mapCompanyPaintProduct(
      data as unknown as Record<string, unknown>,
    );
    if (mapped.name.trim()) return mapped;
  }

  const { data: bookmark, error: bookmarkError } = await input.supabase
    .from("company_paint_products")
    .select("*")
    .eq("id", input.bookmarkId)
    .eq("company_id", input.companyId)
    .single();

  if (bookmarkError || !bookmark) {
    throw new Error(
      bookmarkError?.message ??
        error?.message ??
        "Failed to load saved product.",
    );
  }

  const platformJoin = input.catalogFallback
    ? buildPlatformJoinFallback(input.catalogFallback)
    : input.minimalFallback
      ? {
          id: input.minimalFallback.paintProductId,
          name: input.minimalFallback.name,
          application_type: input.minimalFallback.applicationType ?? "interior",
          paint_manufacturers: input.minimalFallback.manufacturerName?.trim()
            ? { name: input.minimalFallback.manufacturerName.trim() }
            : null,
        }
      : null;

  const fallbackRow = {
    ...(bookmark as Record<string, unknown>),
    ...(platformJoin ? { paint_products: platformJoin } : {}),
  };

  return mapCompanyPaintProduct(fallbackRow);
}

import type { CatalogProductRow } from "@/lib/product-catalog/types";
import type { CompanyPaintProductRole } from "@/types/database";

export function catalogCategoryToCompanyRole(
  category: string,
): CompanyPaintProductRole {
  if (category === "primer" || category === "undercoater") return "primer";
  if (category === "sealer") return "sealer";
  return "topcoat";
}

function resolveImportSheen(catalog: CatalogProductRow): string | null {
  const sheenOptions =
    catalog.sheen_options.length > 0
      ? catalog.sheen_options
      : catalog.sheens.map(String);

  return sheenOptions[0] ?? null;
}

/** Bookmark fields written when importing an existing platform catalog product. */
export function buildPlatformImportBookmarkPayload(
  catalog: CatalogProductRow,
  input: {
    unitCost: number;
    unitPrice?: number;
    coverageSqftPerGallon: number;
  },
): Record<string, unknown> {
  return {
    source: "catalog",
    paint_product_id: catalog.id,
    role: catalogCategoryToCompanyRole(catalog.category),
    unit_cost: input.unitCost,
    unit_price: input.unitPrice ?? input.unitCost,
    coverage_sqft_per_gallon: input.coverageSqftPerGallon,
    sheen: resolveImportSheen(catalog),
    is_active: true,
    name: catalog.name,
    manufacturer_name: catalog.manufacturer_name,
    application_type: catalog.application_type,
    updated_at: new Date().toISOString(),
  };
}

export function buildCompanyPaintProductFromPlatformCatalog(
  catalog: CatalogProductRow,
  input: {
    companyId: string;
    unitCost: number;
    unitPrice?: number;
    coverageSqftPerGallon: number;
  },
): Record<string, unknown> {
  return {
    company_id: input.companyId,
    ...buildPlatformImportBookmarkPayload(catalog, input),
  };
}
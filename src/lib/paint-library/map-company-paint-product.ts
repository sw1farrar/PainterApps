import { DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON } from "@/lib/paint-library/coverage";
import type { SaveCustomPaintProductInput } from "@/lib/paint-library/custom-product-form";

import { resolvePlatformCanImageUrl } from "@/lib/product-catalog/resolve-can-image-url";
import type {
  CompanyPaintProduct,
  CompanyPaintProductRole,
  PaintProductSource,
} from "@/types/database";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";

export function isSupabaseMissingColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    (lower.includes("could not find") && lower.includes("column"))
  );
}

export function buildCompanyPaintProductAttributePayload(
  input: SaveCustomPaintProductInput,
  _companyCoverage: number = DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
): Partial<CompanyPaintProduct> {
  return {
    name: input.name.trim(),
    manufacturer_name: input.manufacturerName?.trim() || null,
    role: input.role,
    unit_cost: input.unitCost,
    unit_price: input.unitCost,
    gallons_per_labor_hour: input.gallonsPerLaborHour ?? null,
    coverage_sqft_per_gallon:
      input.coverageSqftPerGallon ?? DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
    application_type: input.applicationType ?? "interior",
    base_type: input.baseType ?? "unknown",
    resin_type: input.resinType ?? null,
    resin_system: input.resinSystem ?? "unknown",
    product_description: input.productDescription ?? null,
    source_url: input.sourceUrl ?? null,
    sheen: input.sheen ?? null,
    sheen_options: input.sheenOptions ?? [],
    is_self_priming: input.isSelfPriming ?? false,
    is_stain_blocking: input.isStainBlocking ?? false,
    is_mold_mildew_resistant: input.isMoldMildewResistant ?? false,
    is_scrubbable: input.isScrubbable ?? false,
    is_one_coat: input.isOneCoat ?? false,
    paint_system_features: input.paintSystemFeatures ?? [],
    paint_system_feature_options: input.paintSystemFeatureOptions ?? [],
    product_uses: input.productUses ?? [],
    substrates: input.substrates ?? [],
    recommended_uses: input.recommendedUses ?? [],
    voc_level: input.vocLevel ?? "unknown",
    volume_solids_pct: input.volumeSolidsPct ?? null,
    volume_solids_label: input.volumeSolidsLabel ?? null,
    can_image_url: input.canImageUrl ?? null,
    can_image_storage_path: input.canImageStoragePath ?? null,
    updated_at: new Date().toISOString(),
  };
}

/** Pre-migration-037 columns only — used when attribute columns are not on the DB yet. */
export function buildLegacyCompanyPaintProductAttributePayload(
  input: SaveCustomPaintProductInput,
  _companyCoverage: number = DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
): Partial<CompanyPaintProduct> {
  const paintSystemFeatures = [
    ...(input.paintSystemFeatures ?? []),
    ...(input.paintSystemFeatureOptions ?? []),
  ];

  return {
    name: input.name.trim(),
    manufacturer_name: input.manufacturerName?.trim() || null,
    role: input.role,
    unit_cost: input.unitCost,
    unit_price: input.unitCost,
    gallons_per_labor_hour: input.gallonsPerLaborHour ?? null,
    coverage_sqft_per_gallon:
      input.coverageSqftPerGallon ?? DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
    application_type: input.applicationType ?? "interior",
    sheen: input.sheen ?? null,
    is_self_priming: input.isSelfPriming ?? false,
    paint_system_features: paintSystemFeatures,
    updated_at: new Date().toISOString(),
  };
}

const PLATFORM_PAINT_PRODUCT_JOIN_MINIMAL = `
  id,
  name,
  application_type,
  paint_manufacturers (
    name
  )
`;

const PLATFORM_PAINT_PRODUCT_JOIN_ATTRIBUTES = `
  id,
  name,
  application_type,
  resin_type,
  resin_system,
  base_type,
  voc_level,
  product_description,
  source_url,
  attribute_source_url,
  sheen_options,
  paint_system_features,
  paint_system_feature_options,
  product_uses,
  substrates,
  recommended_uses,
  volume_solids_pct,
  volume_solids_label,
  can_image_url,
  can_image_storage_path,
  is_self_priming,
  is_stain_blocking,
  is_mold_mildew_resistant,
  is_scrubbable,
  is_one_coat,
  updated_at,
  paint_manufacturers (
    name
  )
`;

const PLATFORM_PAINT_PRODUCT_JOIN_UNIFIED = `
  id,
  name,
  application_type,
  resin_type,
  resin_system,
  base_type,
  voc_level,
  product_description,
  source_url,
  attribute_source_url,
  sheen_options,
  paint_system_features,
  paint_system_feature_options,
  product_uses,
  substrates,
  recommended_uses,
  volume_solids_pct,
  volume_solids_label,
  can_image_url,
  can_image_storage_path,
  is_self_priming,
  is_stain_blocking,
  is_mold_mildew_resistant,
  is_scrubbable,
  is_one_coat,
  catalog_origin,
  catalog_review_status,
  updated_at,
  paint_manufacturers (
    name
  )
`;

export type PlatformPaintProductJoinVariant =
  | "minimal"
  | "attributes"
  | "unified";

export function platformPaintProductJoin(
  variant: PlatformPaintProductJoinVariant = "unified",
): string {
  if (variant === "minimal") return PLATFORM_PAINT_PRODUCT_JOIN_MINIMAL;
  if (variant === "attributes") return PLATFORM_PAINT_PRODUCT_JOIN_ATTRIBUTES;
  return PLATFORM_PAINT_PRODUCT_JOIN_UNIFIED;
}

export function companyPaintProductSelect(
  joinVariant: PlatformPaintProductJoinVariant = "unified",
): string {
  return `
  *,
  paint_products (
    ${platformPaintProductJoin(joinVariant)}
  )
`;
}

export const COMPANY_PAINT_PRODUCT_SELECT = companyPaintProductSelect("unified");

const COMPANY_CATALOG_LIST_COLUMNS_LEGACY = `
  id,
  company_id,
  source,
  paint_product_id,
  name,
  manufacturer_name,
  role,
  unit_cost,
  unit_price,
  coverage_sqft_per_gallon,
  application_type,
  sheen,
  is_self_priming,
  is_active,
  gallons_per_labor_hour,
  sort_order,
  created_at,
  updated_at
`;

const COMPANY_CATALOG_LIST_COLUMNS_FULL = `
  id,
  company_id,
  source,
  paint_product_id,
  name,
  manufacturer_name,
  role,
  unit_cost,
  unit_price,
  coverage_sqft_per_gallon,
  application_type,
  sheen,
  is_self_priming,
  is_stain_blocking,
  is_mold_mildew_resistant,
  is_scrubbable,
  is_one_coat,
  is_active,
  resin_type,
  resin_system,
  base_type,
  voc_level,
  volume_solids_pct,
  volume_solids_label,
  product_description,
  product_uses,
  substrates,
  recommended_uses,
  sheen_options,
  source_url,
  paint_system_features,
  paint_system_feature_options,
  can_image_url,
  can_image_storage_path,
  gallons_per_labor_hour,
  sort_order,
  created_at,
  updated_at
`;

export function companyPaintCatalogListSelect(input: {
  companyAttributesReady: boolean;
  joinVariant: PlatformPaintProductJoinVariant;
}): string {
  const columns = input.companyAttributesReady
    ? COMPANY_CATALOG_LIST_COLUMNS_FULL
    : COMPANY_CATALOG_LIST_COLUMNS_LEGACY;

  return `
  ${columns},
  paint_products (
    ${platformPaintProductJoin(input.joinVariant)}
  )
`;
}

/** Pre-migration-037 columns safe for catalog list queries. */
export const COMPANY_PAINT_CATALOG_LIST_SELECT_LEGACY =
  companyPaintCatalogListSelect({
    companyAttributesReady: false,
    joinVariant: "unified",
  });

/** Catalog list with company-owned attribute columns (requires migration 037). */
export const COMPANY_PAINT_CATALOG_LIST_SELECT = companyPaintCatalogListSelect({
  companyAttributesReady: true,
  joinVariant: "unified",
});

function parseFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseEnumArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function readLinkedPaintProduct(
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  const linked = row.paint_products;
  if (!linked) return null;
  if (Array.isArray(linked)) {
    return (linked[0] as Record<string, unknown> | undefined) ?? null;
  }
  return linked as Record<string, unknown>;
}

function readLinkedManufacturerName(
  linkedProduct: Record<string, unknown> | null,
): string | null {
  if (!linkedProduct) return null;
  const manufacturers = linkedProduct.paint_manufacturers;
  if (!manufacturers) return null;
  const row = Array.isArray(manufacturers)
    ? (manufacturers[0] as Record<string, unknown> | undefined)
    : (manufacturers as Record<string, unknown>);
  if (!row || typeof row.name !== "string") return null;
  return row.name.trim() || null;
}

/** Platform catalog is authoritative; bookmark snapshots are legacy fallbacks only. */
function readString(
  linkedValue: unknown,
  rowValue: unknown,
): string | null {
  if (typeof linkedValue === "string" && linkedValue.trim()) {
    return linkedValue.trim();
  }
  if (typeof rowValue === "string" && rowValue.trim()) {
    return rowValue.trim();
  }
  return null;
}

function readStringField(
  linkedValue: unknown,
  rowValue: unknown,
): string | null {
  if (typeof linkedValue === "string") return linkedValue.trim() || null;
  if (typeof rowValue === "string") return rowValue.trim() || null;
  return null;
}

function readEnumField(
  linkedValue: unknown,
  rowValue: unknown,
  emptyValues: string[] = ["unknown"],
): string {
  const linked =
    typeof linkedValue === "string" && linkedValue.trim()
      ? linkedValue.trim()
      : null;
  if (linked && !emptyValues.includes(linked)) return linked;

  const local =
    typeof rowValue === "string" && rowValue.trim() ? rowValue.trim() : null;
  if (local && !emptyValues.includes(local)) return local;

  return linked ?? local ?? "unknown";
}

function readStringArrayField(
  linkedValue: unknown,
  rowValue: unknown,
): string[] {
  const linked = parseStringArray(linkedValue);
  if (linked.length > 0) return linked;
  return parseStringArray(rowValue);
}

function readEnumArrayField(linkedValue: unknown, rowValue: unknown): string[] {
  const linked = parseEnumArray(linkedValue);
  if (linked.length > 0) return linked;
  return parseEnumArray(rowValue);
}

export function mapCompanyPaintProduct(
  row: Record<string, unknown>,
): CompanyPaintProductRow {
  const linkedProduct = readLinkedPaintProduct(row);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const platformCanImageUrl = resolvePlatformCanImageUrl(
    supabaseUrl,
    linkedProduct,
  );
  const legacyCanImageUrl = resolvePlatformCanImageUrl(supabaseUrl, {
    can_image_url:
      typeof row.can_image_url === "string" ? row.can_image_url : null,
    can_image_storage_path:
      typeof row.can_image_storage_path === "string"
        ? row.can_image_storage_path
        : null,
  });
  const platformStoragePath =
    typeof linkedProduct?.can_image_storage_path === "string"
      ? linkedProduct.can_image_storage_path.trim() || null
      : null;

  return {
    id: String(row.id),
    company_id: String(row.company_id),
    source: row.source as PaintProductSource,
    paint_product_id: row.paint_product_id ? String(row.paint_product_id) : null,
    name: readString(linkedProduct?.name, row.name) ?? "",
    manufacturer_name:
      readLinkedManufacturerName(linkedProduct) ??
      (row.manufacturer_name ? String(row.manufacturer_name) : null),
    role: row.role as CompanyPaintProductRole,
    unit_cost: Number(row.unit_cost ?? 0),
    unit_price: Number(row.unit_price ?? row.unit_cost ?? 0),
    coverage_sqft_per_gallon:
      row.coverage_sqft_per_gallon != null
        ? Number(row.coverage_sqft_per_gallon)
        : null,
    application_type: linkedProduct?.application_type
      ? String(linkedProduct.application_type)
      : String(row.application_type ?? "interior"),
    sheen:
      typeof row.sheen === "string" && row.sheen.trim()
        ? row.sheen.trim()
        : readStringArrayField(linkedProduct?.sheen_options, null)[0] ?? null,
    is_self_priming: linkedProduct
      ? Boolean(linkedProduct.is_self_priming)
      : Boolean(row.is_self_priming),
    is_stain_blocking: linkedProduct
      ? Boolean(linkedProduct.is_stain_blocking)
      : Boolean(row.is_stain_blocking),
    is_mold_mildew_resistant: linkedProduct
      ? Boolean(linkedProduct.is_mold_mildew_resistant)
      : Boolean(row.is_mold_mildew_resistant),
    is_scrubbable: linkedProduct
      ? Boolean(linkedProduct.is_scrubbable)
      : Boolean(row.is_scrubbable),
    is_one_coat: linkedProduct
      ? Boolean(linkedProduct.is_one_coat)
      : Boolean(row.is_one_coat),
    paint_system_features: readStringArrayField(
      linkedProduct?.paint_system_features,
      row.paint_system_features,
    ),
    paint_system_feature_options: readStringArrayField(
      linkedProduct?.paint_system_feature_options,
      row.paint_system_feature_options,
    ),
    product_description: readStringField(
      linkedProduct?.product_description,
      row.product_description,
    ),
    product_uses: readEnumArrayField(
      linkedProduct?.product_uses,
      row.product_uses,
    ),
    substrates: readEnumArrayField(
      linkedProduct?.substrates,
      row.substrates,
    ),
    recommended_uses: readStringArrayField(
      linkedProduct?.recommended_uses,
      row.recommended_uses,
    ),
    base_type: readEnumField(linkedProduct?.base_type, row.base_type),
    voc_level: readEnumField(linkedProduct?.voc_level, row.voc_level),
    volume_solids_pct:
      linkedProduct?.volume_solids_pct != null
        ? Number(linkedProduct.volume_solids_pct)
        : row.volume_solids_pct != null
          ? Number(row.volume_solids_pct)
          : null,
    volume_solids_label: readStringField(
      linkedProduct?.volume_solids_label,
      row.volume_solids_label,
    ),
    sheen_options: readStringArrayField(
      linkedProduct?.sheen_options,
      row.sheen_options,
    ),
    source_url: readStringField(
      linkedProduct?.source_url ?? linkedProduct?.attribute_source_url,
      row.source_url,
    ),
    gallons_per_labor_hour:
      row.gallons_per_labor_hour != null
        ? Number(row.gallons_per_labor_hour)
        : null,
    resin_type: readString(linkedProduct?.resin_type, row.resin_type),
    resin_system: readString(linkedProduct?.resin_system, row.resin_system),
    can_image_url: platformCanImageUrl ?? legacyCanImageUrl,
    can_image_storage_path: platformStoragePath,
    can_image_updated_at:
      linkedProduct?.updated_at != null
        ? String(linkedProduct.updated_at)
        : String(row.updated_at ?? ""),
    catalog_origin:
      typeof linkedProduct?.catalog_origin === "string"
        ? linkedProduct.catalog_origin
        : null,
    catalog_review_status:
      typeof linkedProduct?.catalog_review_status === "string"
        ? linkedProduct.catalog_review_status
        : null,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}
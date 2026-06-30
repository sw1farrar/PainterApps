import { format } from "date-fns";

import { resolveDisplayAttributes } from "@/lib/product-catalog/infer-product-display-attributes";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import type {
  CatalogProductRow,
  PaintProductApplication,
  PaintProductCategory,
  PaintProductUse,
  PaintResinSystem,
  PaintSubstrate,
} from "@/lib/product-catalog/types";
import type { CompanyPaintProductRole } from "@/types/database";
import {
  formatApplicationType,
  formatBaseType,
  formatCategory,
  formatResinSystem,
  formatSheenOptionsForDisplay,
  formatSlugLabel,
  formatVocLevel,
  formatVolumeSolids,
  listProductCapabilities,
} from "@/lib/product-catalog/product-attribute-display";
import { productCanImageDisplayUrl } from "@/lib/utils";

export type ProductMarketingSheetView = {
  id: string;
  manufacturerName: string;
  manufacturerLogoUrl: string | null;
  productName: string;
  applicationLabel: string;
  categoryLabel: string;
  baseLabel: string;
  resinType: string | null;
  resinSystemLabel: string;
  description: string | null;
  sheenOptions: string[];
  productUses: string[];
  substrates: string[];
  vocLevelLabel: string;
  volumeSolidsLabel: string;
  productCapabilities: string[];
  recommendedUses: string[];
  paintSystemFeatures: string[];
  paintSystemFeatureOptions: string[];
  canImageUrl: string | null;
  isDiscontinued: boolean;
  enrichmentStatus: string;
  lastGatheredLabel: string | null;
  sourceUrl: string | null;
  attributeSourceUrl: string | null;
};

export function formatMarketingSheetLastGathered(
  enrichedAt: string | null | undefined,
  updatedAt: string | null | undefined,
): string | null {
  const value = enrichedAt?.trim() || updatedAt?.trim();
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return format(date, "MMMM d, yyyy");
}

export function applicationLabel(value: string): string {
  if (value === "interior" || value === "exterior" || value === "both") {
    return formatApplicationType(value);
  }
  return value;
}

export function categoryLabel(value: string): string {
  if (
    value === "paint" ||
    value === "primer" ||
    value === "sealer" ||
    value === "undercoater"
  ) {
    return formatCategory(value);
  }
  return value;
}

export function baseLabel(value: string): string {
  if (value === "water" || value === "oil" || value === "solvent" || value === "unknown") {
    return formatBaseType(value);
  }
  return value;
}

function companyRoleToCategory(role: CompanyPaintProductRole): PaintProductCategory {
  if (role === "primer" || role === "undercoater" || role === "sealer") {
    return role;
  }
  return "paint";
}

export function buildCompanyProductMarketingSheetView(
  product: CompanyPaintProductRow,
  options?: { manufacturerLogoUrl?: string | null },
): ProductMarketingSheetView {
  const category = companyRoleToCategory(product.role);
  const display = resolveDisplayAttributes({
    application_type: product.application_type as PaintProductApplication,
    category,
    product_description: product.product_description,
    paint_system_features: product.paint_system_features,
    paint_system_feature_options: product.paint_system_feature_options,
    recommended_uses: product.recommended_uses,
    product_uses: product.product_uses as PaintProductUse[],
    substrates: product.substrates as PaintSubstrate[],
    is_self_priming: product.is_self_priming,
    is_stain_blocking: product.is_stain_blocking,
    is_mold_mildew_resistant: product.is_mold_mildew_resistant,
    is_scrubbable: product.is_scrubbable,
    is_one_coat: product.is_one_coat,
  });

  return {
    id: product.id,
    manufacturerName: product.manufacturer_name?.trim() || "—",
    manufacturerLogoUrl: options?.manufacturerLogoUrl ?? null,
    productName: product.name,
    applicationLabel: applicationLabel(product.application_type),
    categoryLabel: categoryLabel(category),
    baseLabel: baseLabel(product.base_type),
    resinType: product.resin_type,
    resinSystemLabel: formatResinSystem(
      (product.resin_system ?? "unknown") as PaintResinSystem,
    ),
    description: product.product_description,
    sheenOptions: formatSheenOptionsForDisplay(product.sheen_options, []),
    productUses: display.productUses.map((use) => formatSlugLabel(use)),
    substrates: display.substrates.map((substrate) =>
      formatSlugLabel(substrate),
    ),
    vocLevelLabel: formatVocLevel(
      product.voc_level as "zero" | "low" | "standard" | "unknown",
    ),
    volumeSolidsLabel: formatVolumeSolids(
      product.volume_solids_pct,
      product.volume_solids_label,
    ),
    productCapabilities: listProductCapabilities(display.capabilityFlags),
    recommendedUses: product.recommended_uses,
    paintSystemFeatures: product.paint_system_features,
    paintSystemFeatureOptions: product.paint_system_feature_options,
    canImageUrl: productCanImageDisplayUrl(
      product.can_image_url,
      product.can_image_updated_at ?? product.updated_at,
    ),
    isDiscontinued: false,
    enrichmentStatus: "complete",
    lastGatheredLabel: formatMarketingSheetLastGathered(
      null,
      product.updated_at,
    ),
    sourceUrl: product.source_url,
    attributeSourceUrl: product.source_url,
  };
}

export function buildProductMarketingSheetView(
  product: CatalogProductRow,
): ProductMarketingSheetView {
  const display = resolveDisplayAttributes(product);

  return {
    id: product.id,
    manufacturerName: product.manufacturer_name,
    manufacturerLogoUrl: product.manufacturer_logo_url,
    productName: product.name,
    applicationLabel: applicationLabel(product.application_type),
    categoryLabel: categoryLabel(product.category),
    baseLabel: baseLabel(product.base_type),
    resinType: product.resin_type,
    resinSystemLabel: formatResinSystem(product.resin_system),
    description: product.product_description,
    sheenOptions: formatSheenOptionsForDisplay(
      product.sheen_options,
      product.sheens,
    ),
    productUses: display.productUses.map((use) => formatSlugLabel(use)),
    substrates: display.substrates.map((substrate) =>
      formatSlugLabel(substrate),
    ),
    vocLevelLabel: formatVocLevel(product.voc_level),
    volumeSolidsLabel: formatVolumeSolids(
      product.volume_solids_pct,
      product.volume_solids_label,
    ),
    productCapabilities: listProductCapabilities(display.capabilityFlags),
    recommendedUses: product.recommended_uses,
    paintSystemFeatures: product.paint_system_features,
    paintSystemFeatureOptions: product.paint_system_feature_options,
    canImageUrl: productCanImageDisplayUrl(
      product.can_image_url,
      product.updated_at,
    ),
    isDiscontinued: product.is_discontinued,
    enrichmentStatus: product.enrichment_status,
    lastGatheredLabel: formatMarketingSheetLastGathered(
      product.enriched_at,
      product.updated_at,
    ),
    sourceUrl: product.source_url,
    attributeSourceUrl: product.attribute_source_url,
  };
}

function normalizeMetaPillKey(value: string): string {
  return value.trim().toLowerCase();
}

export function buildProductMarketingSheetMetaPills(
  view: ProductMarketingSheetView,
): string[] {
  const candidates = [
    view.categoryLabel,
    view.baseLabel,
    view.resinType,
    view.resinSystemLabel !== "—" ? view.resinSystemLabel : null,
    view.vocLevelLabel !== "—" ? view.vocLevelLabel : null,
    view.volumeSolidsLabel !== "—" ? view.volumeSolidsLabel : null,
  ].filter((value): value is string => Boolean(value?.trim()));

  const seen = new Set<string>();
  const pills: string[] = [];

  for (const pill of candidates) {
    const key = normalizeMetaPillKey(pill);
    if (seen.has(key)) continue;
    seen.add(key);
    pills.push(pill);
  }

  return pills;
}

export function productMarketingSheetFilename(view: ProductMarketingSheetView): string {
  const slug = `${view.manufacturerName}-${view.productName}`
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 64);

  return `${slug || "product"}-marketing-sheet.pdf`;
}
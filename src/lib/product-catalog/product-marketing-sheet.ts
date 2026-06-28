import { format } from "date-fns";

import type { CatalogProductRow } from "@/lib/product-catalog/types";
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

export function buildProductMarketingSheetView(
  product: CatalogProductRow,
): ProductMarketingSheetView {
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
    productUses: product.product_uses.map((use) => formatSlugLabel(use)),
    substrates: product.substrates.map((substrate) =>
      formatSlugLabel(substrate),
    ),
    vocLevelLabel: formatVocLevel(product.voc_level),
    volumeSolidsLabel: formatVolumeSolids(
      product.volume_solids_pct,
      product.volume_solids_label,
    ),
    productCapabilities: listProductCapabilities({
      isSelfPriming: product.is_self_priming,
      isStainBlocking: product.is_stain_blocking,
      isMoldMildewResistant: product.is_mold_mildew_resistant,
      isScrubbable: product.is_scrubbable,
      isOneCoat: product.is_one_coat,
    }),
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
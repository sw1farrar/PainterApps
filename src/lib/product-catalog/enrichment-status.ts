import type { PaintProductRow } from "@/lib/product-catalog/types";

export type PaintProductEnrichmentStatus = "pending" | "partial" | "complete";

export type ProductEnrichmentGap =
  | "can_image"
  | "resin_type"
  | "resin_system"
  | "description"
  | "paint_features"
  | "sheens"
  | "product_uses"
  | "substrates"
  | "volume_solids"
  | "voc_level"
  | "base_type";

export const PRODUCT_ENRICHMENT_GAP_LABELS: Record<ProductEnrichmentGap, string> =
  {
    can_image: "Can image",
    resin_type: "Resin type",
    resin_system: "Resin system",
    description: "Description",
    paint_features: "Paint system features",
    sheens: "Sheens",
    product_uses: "Product uses",
    substrates: "Substrates",
    volume_solids: "Volume solids",
    voc_level: "VOC level",
    base_type: "Base type",
  };

export type EnrichmentStatusInput = Pick<
  PaintProductRow,
  | "can_image_url"
  | "resin_type"
  | "resin_system"
  | "base_type"
  | "product_description"
  | "paint_system_feature_options"
  | "sheen_options"
  | "sheens"
  | "product_uses"
  | "substrates"
  | "voc_level"
  | "volume_solids_pct"
>;

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    items.push(trimmed);
  }
  return items;
}

export function getProductEnrichmentGaps(
  product: EnrichmentStatusInput,
): ProductEnrichmentGap[] {
  const gaps: ProductEnrichmentGap[] = [];

  if (!product.can_image_url?.trim()) gaps.push("can_image");
  if (!product.resin_type?.trim()) gaps.push("resin_type");
  if (!product.resin_system || product.resin_system === "unknown") {
    gaps.push("resin_system");
  }
  if (!product.product_description?.trim()) gaps.push("description");
  if (parseStringArray(product.paint_system_feature_options).length === 0) {
    gaps.push("paint_features");
  }
  if (
    product.sheens.length === 0 &&
    parseStringArray(product.sheen_options).length === 0
  ) {
    gaps.push("sheens");
  }
  if (product.product_uses.length === 0) gaps.push("product_uses");
  if (product.substrates.length === 0) gaps.push("substrates");
  if (product.volume_solids_pct == null) gaps.push("volume_solids");
  if (!product.voc_level || product.voc_level === "unknown") {
    gaps.push("voc_level");
  }
  if (!product.base_type || product.base_type === "unknown") {
    gaps.push("base_type");
  }

  return gaps;
}

export function productNeedsEnrichment(product: EnrichmentStatusInput): boolean {
  return getProductEnrichmentGaps(product).length > 0;
}

export function toEnrichmentStatusInput(
  product: Partial<EnrichmentStatusInput> & {
    sheens?: EnrichmentStatusInput["sheens"];
    product_uses?: EnrichmentStatusInput["product_uses"];
    substrates?: EnrichmentStatusInput["substrates"];
  },
): EnrichmentStatusInput {
  return {
    can_image_url: product.can_image_url ?? null,
    resin_type: product.resin_type ?? null,
    resin_system: product.resin_system ?? "unknown",
    base_type: product.base_type ?? "unknown",
    product_description: product.product_description ?? null,
    paint_system_feature_options: parseStringArray(
      product.paint_system_feature_options,
    ),
    sheen_options: parseStringArray(product.sheen_options),
    sheens: product.sheens ?? [],
    product_uses: product.product_uses ?? [],
    substrates: product.substrates ?? [],
    voc_level: product.voc_level ?? "unknown",
    volume_solids_pct: product.volume_solids_pct ?? null,
  };
}

function hasCoreEnrichment(product: EnrichmentStatusInput): boolean {
  return (
    Boolean(product.can_image_url?.trim()) &&
    Boolean(product.resin_type?.trim()) &&
    product.resin_system !== "unknown" &&
    Boolean(product.product_description?.trim()) &&
    parseStringArray(product.paint_system_feature_options).length > 0 &&
    (product.sheens.length > 0 ||
      parseStringArray(product.sheen_options).length > 0) &&
    product.product_uses.length > 0
  );
}

export function computeEnrichmentStatus(
  product: EnrichmentStatusInput,
): PaintProductEnrichmentStatus {
  const gaps = getProductEnrichmentGaps(product);
  if (gaps.length === 0) return "complete";
  if (hasCoreEnrichment(product)) return "partial";
  if (
    product.can_image_url?.trim() ||
    product.resin_type?.trim() ||
    product.product_description?.trim() ||
    parseStringArray(product.paint_system_feature_options).length > 0 ||
    product.sheens.length > 0 ||
    product.product_uses.length > 0
  ) {
    return "partial";
  }
  return "pending";
}
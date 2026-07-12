import { formatPaintProductLabel } from "@/lib/paint-library/product-label";
import {
  emptyTierPaintConfig,
  QUOTE_PAINT_TIERS,
  resolveTierPaintConfig,
  type CompanyPaintProductRow,
  type TierPaintConfigInput,
  type TierPaintSummary,
} from "./types";

type ProductLike = Pick<
  CompanyPaintProductRow,
  "id" | "name" | "role" | "is_self_priming"
> & {
  unit_cost?: number;
};

export function buildProductsMapFromList(
  products: ProductLike[],
): Map<string, ProductLike> {
  return new Map(products.map((product) => [product.id, product]));
}

export function buildTierPaintSummaries(
  configs: TierPaintConfigInput[],
  products: ProductLike[],
): TierPaintSummary[] {
  const productsById = buildProductsMapFromList(products);

  return QUOTE_PAINT_TIERS.map((tier) => {
    const config =
      configs.find((row) => row.tier === tier) ?? emptyTierPaintConfig(tier);
    const resolved = resolveTierPaintConfig(
      config,
      productsById as Map<string, CompanyPaintProductRow>,
    );

    return {
      tier,
      primerName: resolved.topcoat?.is_self_priming
        ? null
        : resolved.primer
          ? formatPaintProductLabel(resolved.primer)
          : null,
      topcoatName: resolved.topcoat
        ? formatPaintProductLabel(resolved.topcoat)
        : null,
      primerCoats: config.primer_coats,
      topcoatCoats: config.topcoat_coats,
    };
  });
}
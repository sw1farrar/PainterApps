import { formatCurrency } from "@/lib/utils";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";

export type PaintProductLabelInput = Pick<CompanyPaintProductRow, "name"> & {
  unit_cost?: number;
};

export function formatPaintProductCostPerGallon(unitCost: number): string {
  return `${formatCurrency(unitCost)}/gal`;
}

/** Product name with cost per gallon — for dropdowns and descriptions. */
export function formatPaintProductLabel(product: PaintProductLabelInput): string {
  return `${product.name} · ${formatPaintProductCostPerGallon(product.unit_cost ?? 0)}`;
}

export function formatPaintProductLabelById(
  productId: string | null | undefined,
  productsById: Map<string, PaintProductLabelInput>,
  fallback = "Not set",
): string {
  if (!productId) return fallback;
  const product = productsById.get(productId);
  if (!product) return fallback;
  return formatPaintProductLabel(product);
}
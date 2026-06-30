/** Default spread rate when a product has no coverage override (sq ft per gallon). */
export const DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON = 350;

export function resolveProductCoverageSqFt(
  product: { coverage_sqft_per_gallon?: number | null } | null | undefined,
): number {
  const value = product?.coverage_sqft_per_gallon;
  if (value != null && value > 0) return value;
  return DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON;
}
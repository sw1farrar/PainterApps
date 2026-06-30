/** Default catalog markup: 20% profit margin on unit cost. */
export const CATALOG_PROFIT_MARGIN = 0.2;

export function unitPriceFromUnitCost(unitCost: number): number {
  const cost = Number.isFinite(unitCost) ? unitCost : 0;
  return Math.round(cost * (1 + CATALOG_PROFIT_MARGIN) * 100) / 100;
}
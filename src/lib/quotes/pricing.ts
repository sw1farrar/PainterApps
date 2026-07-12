import { QUOTE_PAINT_TIERS } from "@/lib/paint-library/types";
import type {
  Company,
  QuoteLineItem,
  QuoteTierName,
  QuoteUpgradeRules,
} from "@/types/database";

const DEFAULT_MULTIPLIERS: Record<string, number> = {
  good: 1,
  better: 1.15,
  best: 1.3,
  beautiful: 1.5,
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Selling price from at-cost and target gross margin % on the selling price.
 * sell = cost ÷ (1 − margin%/100)
 */
export function sellPriceFromMargin(
  costAtCost: number,
  marginPct: number,
): number {
  if (costAtCost <= 0) return 0;
  if (marginPct >= 100) return roundMoney(costAtCost);
  return roundMoney(costAtCost / (1 - marginPct / 100));
}

export function markupAmountFromMargin(
  costAtCost: number,
  marginPct: number,
): number {
  return roundMoney(sellPriceFromMargin(costAtCost, marginPct) - costAtCost);
}

/** Blended gross margin on a bid price: profit ÷ sell × 100. */
export function grossMarginPctFromParts(
  directCost: number,
  bidPrice: number,
): number {
  if (bidPrice <= 0) return 0;
  const profit = bidPrice - directCost;
  if (profit <= 0) return 0;
  return Math.round((profit / bidPrice) * 1000) / 10;
}

/** Stored `markup` field is gross margin % on selling price. */
export function lineItemLineTotal(
  item: Pick<QuoteLineItem, "qty" | "unit_cost" | "markup">,
): number {
  const cost = item.qty * item.unit_cost;
  return sellPriceFromMargin(cost, item.markup ?? 0);
}

export type LineItemsSubtotalOptions = {
  excludeOptional?: boolean;
};

export function lineItemsSubtotal(
  items: QuoteLineItem[],
  options?: LineItemsSubtotalOptions,
): number {
  return items.reduce((sum, item) => {
    if (options?.excludeOptional && item.is_optional) return sum;
    return sum + lineItemLineTotal(item);
  }, 0);
}

/** Sum of qty × unit_cost — what you pay (no markup). Used for overhead + margin pricing. */
export function lineItemsDirectCostAtCost(
  items: Pick<QuoteLineItem, "qty" | "unit_cost" | "is_optional">[],
  options?: LineItemsSubtotalOptions,
): number {
  return items.reduce((sum, item) => {
    if (options?.excludeOptional && item.is_optional) return sum;
    return sum + item.qty * item.unit_cost;
  }, 0);
}

export type QuoteTotals = {
  subtotal: number;
  overhead: number;
  beforeTax: number;
  tax: number;
  total: number;
};

export function calculateQuoteTotals(
  subtotal: number,
  company: Pick<Company, "overhead_pct" | "tax_rate">,
): QuoteTotals {
  const overhead = subtotal * ((company.overhead_pct ?? 0) / 100);
  const beforeTax = subtotal + overhead;
  const tax = beforeTax * ((company.tax_rate ?? 0) / 100);

  return {
    subtotal,
    overhead,
    beforeTax,
    tax,
    total: beforeTax + tax,
  };
}

export type JobPricingBreakdown = {
  directCost: number;
  overhead: number;
  loadedCost: number;
  grossMarginPct: number;
  sellingPrice: number;
};

/** Step 2: direct costs + overhead burden. */
export function calculateLoadedJobCost(
  directCost: number,
  overheadPct: number,
): { overhead: number; loadedCost: number } {
  const overhead = directCost * (overheadPct / 100);
  return {
    overhead,
    loadedCost: directCost + overhead,
  };
}

/**
 * Step 3: Selling price from loaded cost and target gross margin.
 * Selling Price = Loaded Cost ÷ (1 − Desired Margin %)
 */
export function calculateSellingPrice(
  loadedCost: number,
  grossMarginPct: number,
): number {
  return Math.round(sellPriceFromMargin(loadedCost, grossMarginPct));
}

export function calculateJobPricing(
  directCost: number,
  overheadPct: number,
  grossMarginPct: number,
): JobPricingBreakdown {
  const { overhead, loadedCost } = calculateLoadedJobCost(
    directCost,
    overheadPct,
  );
  return {
    directCost,
    overhead,
    loadedCost,
    grossMarginPct,
    sellingPrice: calculateSellingPrice(loadedCost, grossMarginPct),
  };
}

export function estimateGallons(sqFt: number, coats: number, coverage: number): number {
  if (!coverage) return 0;
  return Math.ceil((sqFt * coats) / coverage);
}

export type TierCostAdjustment = {
  materialDelta?: number;
  laborDelta?: number;
};

export function calculateTierPrices(
  baseSubtotal: number,
  rules?: QuoteUpgradeRules | null,
  defaultMargins?: Record<string, number> | null,
  tierAdjustments?: Partial<Record<QuoteTierName, TierCostAdjustment>>,
): Record<QuoteTierName, { price: number; margin: number }> {
  const multipliers = rules?.tier_multipliers ?? DEFAULT_MULTIPLIERS;
  const premium = rules?.premium_service_fee ?? 0;

  const result = {} as Record<QuoteTierName, { price: number; margin: number }>;

  QUOTE_PAINT_TIERS.forEach((tier, index) => {
    const adjustment = tierAdjustments?.[tier];
    const tierDirectCost =
      baseSubtotal +
      (adjustment?.materialDelta ?? 0) +
      (adjustment?.laborDelta ?? 0);
    const multiplier = multipliers[tier] ?? 1 + index * 0.15;
    const tierPremium = index * (rules?.per_gallon_premium ?? 0) + (index > 0 ? premium : 0);
    const targetMargin = defaultMargins?.[tier];
    const price =
      targetMargin != null && targetMargin < 100
        ? calculateSellingPrice(tierDirectCost, targetMargin) + tierPremium
        : Math.round(tierDirectCost * multiplier + tierPremium);
    const tierCostBase = tierDirectCost;
    const margin =
      tierCostBase > 0
        ? ((price - tierCostBase) / price) * 100
        : targetMargin ?? 0;
    result[tier] = {
      price,
      margin: Math.round((margin ?? 0) * 10) / 10,
    };
  });

  return result;
}
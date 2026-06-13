import type {
  Company,
  QuoteLineItem,
  QuoteTierName,
  QuoteUpgradeRules,
} from "@/types/database";

const TIER_ORDER: QuoteTierName[] = ["good", "better", "best", "beautiful"];

const DEFAULT_MULTIPLIERS: Record<QuoteTierName, number> = {
  good: 1,
  better: 1.15,
  best: 1.3,
  beautiful: 1.5,
};

export function lineItemsSubtotal(items: QuoteLineItem[]): number {
  return items.reduce((sum, item) => {
    const cost = item.qty * item.unit_cost;
    const markupAmount = cost * (item.markup / 100);
    return sum + cost + markupAmount;
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

export function estimateGallons(sqFt: number, coats: number, coverage: number): number {
  if (!coverage) return 0;
  return Math.ceil((sqFt * coats) / coverage);
}

export function calculateTierPrices(
  baseSubtotal: number,
  rules?: QuoteUpgradeRules | null,
  defaultMargins?: Record<string, number> | null,
): Record<QuoteTierName, { price: number; margin: number }> {
  const multipliers = rules?.tier_multipliers ?? DEFAULT_MULTIPLIERS;
  const premium = rules?.premium_service_fee ?? 0;

  const result = {} as Record<QuoteTierName, { price: number; margin: number }>;

  TIER_ORDER.forEach((tier, index) => {
    const multiplier = multipliers[tier] ?? 1 + index * 0.15;
    const tierPremium = index * (rules?.per_gallon_premium ?? 0) + (index > 0 ? premium : 0);
    const targetMargin = defaultMargins?.[tier];
    const price =
      targetMargin != null && targetMargin < 100
        ? Math.round(baseSubtotal / (1 - targetMargin / 100) + tierPremium)
        : Math.round(baseSubtotal * multiplier + tierPremium);
    const margin =
      baseSubtotal > 0 ? ((price - baseSubtotal) / price) * 100 : targetMargin ?? 0;
    result[tier] = {
      price,
      margin: Math.round((margin ?? 0) * 10) / 10,
    };
  });

  return result;
}
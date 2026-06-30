import { readDefaultGrossMarginPct } from "@/lib/quotes/company-estimate-defaults";
import {
  calculateJobPricing,
  lineItemsDirectCostAtCost,
  type JobPricingBreakdown,
} from "@/lib/quotes/pricing";
import type { Company, QuoteLineItem } from "@/types/database";

type LineItemLike = Pick<QuoteLineItem, "qty" | "unit_cost" | "markup" | "is_optional">;

export function suggestQuotePriceFromLineItems(
  items: LineItemLike[],
  company: Pick<Company, "overhead_pct" | "default_margins">,
  grossMarginTier: "good" | "better" | "best" = "good",
  grossMarginPctOverride?: number | null,
): JobPricingBreakdown {
  const directCost = lineItemsDirectCostAtCost(
    items.map((item) => ({
      qty: item.qty,
      unit_cost: item.unit_cost,
      is_optional: item.is_optional ?? false,
    })),
    { excludeOptional: true },
  );

  const grossMarginPct =
    grossMarginPctOverride != null &&
    grossMarginPctOverride >= 0 &&
    grossMarginPctOverride < 100
      ? grossMarginPctOverride
      : readDefaultGrossMarginPct(
          company.default_margins as Record<string, number> | null,
        );

  return calculateJobPricing(
    directCost,
    company.overhead_pct ?? 0,
    grossMarginPct,
  );
}
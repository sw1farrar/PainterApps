import type { QuoteStep } from "@/components/quotes/hooks/useQuoteBuilder";
import type { QuoteStatus } from "@/types/database";

export type ResumeStepInput = {
  status: QuoteStatus;
  quote_tiers?: { price: number; tier: string }[] | null;
  quote_line_items?: { id: string }[] | null;
  quote_tier_paint_config?:
    | { tier: string; topcoat_product_id: string | null }[]
    | null;
};

export function resumeStepForQuote(quote: ResumeStepInput): QuoteStep {
  const tiers = quote.quote_tiers ?? [];
  if (quote.status !== "draft") return "review";
  if (tiers.some((tier) => tier.price > 0)) return "polish";

  const lineItems = quote.quote_line_items ?? [];
  if (lineItems.length > 0) {
    const paintConfig = quote.quote_tier_paint_config ?? [];
    const goodConfig = paintConfig.find((row) => row.tier === "good");
    if (!goodConfig?.topcoat_product_id) return "paint-options";
    return "tiers";
  }

  return "estimator";
}

export function resumeStepFromWorkspace(data: {
  quote: { status: QuoteStatus };
  tiers: { price: number; tier: string }[];
  lineItems: { id: string }[];
  tierPaintConfig: {
    tier: string;
    topcoat_product_id?: string | null;
  }[];
}): QuoteStep {
  return resumeStepForQuote({
    status: data.quote.status,
    quote_tiers: data.tiers,
    quote_line_items: data.lineItems,
    quote_tier_paint_config: data.tierPaintConfig.map((row) => ({
      tier: row.tier,
      topcoat_product_id: row.topcoat_product_id ?? null,
    })),
  });
}
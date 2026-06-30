import type { LineItemInput, TierInput } from "@/app/app/(portal)/quotes/actions";
import { lineItemTotal } from "@/lib/quotes/area-helpers";
import type { QuoteTierName } from "@/types/database";

export const SIMPLE_QUOTE_STEPS = [
  "job",
  "baseline",
  "items",
  "tiers",
  "send",
] as const;
export type SimpleQuoteStep = (typeof SIMPLE_QUOTE_STEPS)[number];

export const SIMPLE_STEP_META: {
  id: SimpleQuoteStep;
  label: string;
  description: string;
}[] = [
  { id: "job", label: "Job", description: "Customer and site" },
  { id: "baseline", label: "Systems", description: "Paint per surface" },
  { id: "items", label: "Areas", description: "Rooms and scope" },
  { id: "tiers", label: "Options", description: "Good / Better / Best" },
  { id: "send", label: "Send", description: "Price and deliver" },
];

export function emptyLineItem(sortOrder = 0): LineItemInput {
  return {
    type: "labor",
    description: "",
    qty: 1,
    unit_cost: 0,
    markup: 0,
    sort_order: sortOrder,
    is_optional: false,
    source: "manual",
    room_id: null,
    company_paint_product_id: null,
    paint_role: null,
  };
}

export function defaultSimpleTiers(quotePrice: number): TierInput[] {
  const tiers: QuoteTierName[] = ["good", "better", "best"];
  return tiers.map((tier) => ({
    tier,
    price: tier === "good" ? quotePrice : 0,
    margin: 0,
    features: [],
    benefits: [],
    display_name: null,
  }));
}

export function lineItemsTotal(items: LineItemInput[]): number {
  return items.reduce((sum, item) => {
    if (item.is_optional) return sum;
    return sum + lineItemTotal(item);
  }, 0);
}

export function quotePriceFromTiers(
  tiers: { tier: string; price: number }[],
): number {
  const good = tiers.find((t) => t.tier === "good");
  if (good && good.price > 0) return good.price;
  return tiers.find((t) => t.price > 0)?.price ?? 0;
}
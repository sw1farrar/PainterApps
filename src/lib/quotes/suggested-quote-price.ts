import {
  lineItemsDirectCostAtCost,
  lineItemsSubtotal,
  type JobPricingBreakdown,
} from "@/lib/quotes/pricing";
import type { QuoteLineItem } from "@/types/database";

type LineItemLike = Pick<QuoteLineItem, "qty" | "unit_cost" | "markup" | "is_optional">;

export function suggestQuotePriceFromLineItems(
  items: LineItemLike[],
): JobPricingBreakdown {
  const scoped = items.map((item) => ({
    qty: item.qty,
    unit_cost: item.unit_cost,
    markup: item.markup ?? 0,
    is_optional: item.is_optional ?? false,
  }));

  const directCost = lineItemsDirectCostAtCost(scoped, { excludeOptional: true });
  const sellingPrice = lineItemsSubtotal(
    scoped.map((item, index) => ({
      id: `item-${index}`,
      quote_id: "",
      type: "material" as const,
      description: "",
      qty: item.qty,
      unit_cost: item.unit_cost,
      markup: item.markup,
      source: "manual" as const,
      room_id: null,
      is_optional: item.is_optional,
      sort_order: index,
      company_paint_product_id: null,
      paint_role: null,
    })),
    { excludeOptional: true },
  );

  return {
    directCost,
    overhead: 0,
    loadedCost: directCost,
    grossMarginPct: 0,
    sellingPrice,
  };
}
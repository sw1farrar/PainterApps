import type { AreaCostBreakdown } from "@/lib/quotes/area-pricing";
import type { RoomInput } from "@/app/app/(portal)/quotes/actions";

export type JobBidSummary = {
  directCost: number;
  grossProfit: number;
  grossMarginPct: number;
  bidTotal: number;
};

type CustomQuoteLineItem = {
  item: {
    is_optional?: boolean;
    qty: number;
    unit_cost: number;
  };
};

export function computeJobBidSummary({
  rooms,
  areaCostBreakdowns,
  customQuoteLineItems,
  itemsSubtotal,
}: {
  rooms: RoomInput[];
  areaCostBreakdowns: AreaCostBreakdown[];
  customQuoteLineItems: CustomQuoteLineItem[];
  itemsSubtotal: number;
}): JobBidSummary {
  const areasCost = rooms.reduce((sum, room, index) => {
    if (room.is_optional) return sum;
    return sum + (areaCostBreakdowns[index]?.directCost ?? 0);
  }, 0);
  const customCost = customQuoteLineItems.reduce((sum, { item }) => {
    if (item.is_optional) return sum;
    return sum + item.qty * item.unit_cost;
  }, 0);
  const directCost = Math.round((areasCost + customCost) * 100) / 100;
  const bidTotal = itemsSubtotal;
  const grossProfit = Math.round((bidTotal - directCost) * 100) / 100;
  const grossMarginPct =
    bidTotal > 0 && grossProfit > 0
      ? Math.round((grossProfit / bidTotal) * 1000) / 10
      : 0;

  return { directCost, grossProfit, grossMarginPct, bidTotal };
}
import { ONBOARDING_DEFAULTS } from "@/lib/onboarding/defaults";
import type { TaggedLineItem } from "@/lib/quotes/estimation/types";
import type { Company } from "@/types/database";

export type EstimatePricingDefaults = {
  laborMarkupPct: number;
  materialMarkupPct: number;
  sundriesPct: number;
};

type CompanyPricingFields = Pick<
  Company,
  "material_markup" | "labor_markup_pct" | "sundries_pct"
>;

export function getEstimatePricingDefaults(
  company: CompanyPricingFields,
): EstimatePricingDefaults {
  return {
    laborMarkupPct:
      company.labor_markup_pct ?? ONBOARDING_DEFAULTS.laborMarkupPct,
    /** At-cost materials; profit is overhead + gross margin on the job. */
    materialMarkupPct: 0,
    sundriesPct: 0,
  };
}

export function isSundriesLineItem(
  item: Pick<TaggedLineItem, "description">,
): boolean {
  return item.description.toLowerCase().includes("sundries");
}

export function paintMaterialCostAtCost(
  items: Pick<TaggedLineItem, "type" | "qty" | "unit_cost" | "description">[],
): number {
  return items
    .filter(
      (item) => item.type === "material" && !isSundriesLineItem(item),
    )
    .reduce((sum, item) => sum + item.qty * item.unit_cost, 0);
}

export function buildSundriesLineItem(params: {
  roomRef: string;
  paintCostAtCost: number;
  sundriesPct: number;
  roomIndex?: number;
  roomId?: string | null;
  source?: TaggedLineItem["source"];
  sortOrder?: number;
}): TaggedLineItem | null {
  const amount = params.paintCostAtCost * (params.sundriesPct / 100);
  if (amount <= 0 || params.sundriesPct <= 0) return null;

  return {
    type: "material",
    description: `${params.roomRef} — sundries & supplies`,
    qty: 1,
    unit_cost: Math.round(amount * 100) / 100,
    markup: 0,
    source: params.source ?? "surface",
    room_index: params.roomIndex,
    room_id: params.roomId ?? null,
    is_optional: false,
    sort_order: params.sortOrder ?? 99,
    company_paint_product_id: null,
    paint_role: null,
  };
}

function roomRefFromItems(items: TaggedLineItem[]): string {
  const sample = items.find((item) => item.description?.includes(" — "));
  if (!sample?.description) return "Project";
  return sample.description.split(" — ")[0]?.trim() || "Project";
}

export function appendSundriesLineItems(
  items: TaggedLineItem[],
  company: CompanyPricingFields,
): TaggedLineItem[] {
  const { sundriesPct } = getEstimatePricingDefaults(company);
  if (sundriesPct <= 0) return items;

  const withoutSundries = items.filter((item) => !isSundriesLineItem(item));
  const groups = new Map<number | "project", TaggedLineItem[]>();

  for (const item of withoutSundries) {
    const key =
      item.room_index !== undefined ? item.room_index : ("project" as const);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const result: TaggedLineItem[] = [...withoutSundries];

  for (const [key, roomItems] of groups) {
    const paintCost = paintMaterialCostAtCost(roomItems);
    const sundries = buildSundriesLineItem({
      roomRef: roomRefFromItems(roomItems),
      paintCostAtCost: paintCost,
      sundriesPct,
      roomIndex: key === "project" ? undefined : key,
      roomId: roomItems.find((item) => item.room_id)?.room_id ?? null,
      source: roomItems[0]?.source ?? "surface",
    });
    if (sundries) result.push(sundries);
  }

  return result;
}
import type { AreaCostBreakdown } from "@/lib/quotes/area-pricing";
import {
  isSundriesFixedAmount,
  type AreaOverheadSettings,
} from "@/lib/quotes/area-overhead";
import { isSundriesLineItem } from "@/lib/quotes/estimate-pricing-defaults";
import type { TaggedLineItem } from "@/lib/quotes/estimation/types";
import { formatLaborHours } from "@/lib/quotes/surface-productivity";
import { formatGallons } from "@/lib/quotes/surface-gallons";
import { formatCurrency } from "@/lib/utils";

export type AreaMiniQuoteItem = {
  key: string;
  name: string;
  rateDetail: string;
  amount: number;
};

export type AreaMiniQuoteSection = {
  key: string;
  title: string;
  items: AreaMiniQuoteItem[];
};

export type AreaMiniQuoteDocument = {
  sections: AreaMiniQuoteSection[];
  total: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function stripRoomPrefix(description: string): string {
  const parts = description.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ").trim() : description.trim();
}

/** Product label only — drops room and substrate prefixes like "Wall 1". */
function materialProductLabel(item: TaggedLineItem): string {
  const stripped = stripRoomPrefix(item.description);
  const parts = stripped
    .split(" — ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return parts[parts.length - 1]!;
  }

  return stripped;
}

function materialMergeKey(item: TaggedLineItem): string {
  if (item.company_paint_product_id) {
    return `${item.company_paint_product_id}|${item.unit_cost}|${item.paint_role ?? ""}`;
  }

  return `${materialProductLabel(item)}|${item.unit_cost}|${item.paint_role ?? ""}`;
}

function isPrepLaborLine(
  item: Pick<TaggedLineItem, "type" | "description">,
): boolean {
  if (item.type !== "labor") return false;
  const desc = item.description.toLowerCase();
  return desc.endsWith("(prep)") || desc.includes("surface prep");
}

function mergeMaterialItems(items: TaggedLineItem[]): AreaMiniQuoteItem[] {
  const merged = new Map<
    string,
    { name: string; qty: number; unitCost: number; extended: number }
  >();

  for (const item of items) {
    if (item.type !== "material" || isSundriesLineItem(item) || item.is_optional) {
      continue;
    }

    const name = materialProductLabel(item);
    const key = materialMergeKey(item);
    const extended = roundMoney(item.qty * item.unit_cost);
    const existing = merged.get(key);

    if (existing) {
      existing.qty = roundMoney(existing.qty + item.qty);
      existing.extended = roundMoney(existing.extended + extended);
    } else {
      merged.set(key, {
        name,
        qty: item.qty,
        unitCost: item.unit_cost,
        extended,
      });
    }
  }

  return [...merged.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({
      key: `material-${row.name}-${row.unitCost}`,
      name: row.name,
      rateDetail: `${formatGallons(row.qty)} gal @ ${formatCurrency(row.unitCost)}/gal`,
      amount: row.extended,
    }));
}

function buildSundriesItems(
  lineItems: TaggedLineItem[],
  breakdown: AreaCostBreakdown,
  overheadSettings: AreaOverheadSettings,
): AreaMiniQuoteItem[] {
  const items: AreaMiniQuoteItem[] = [];

  for (const item of lineItems) {
    if (!isSundriesLineItem(item) || item.is_optional) continue;
    const name = stripRoomPrefix(item.description);
    const extended = roundMoney(item.qty * item.unit_cost);
    items.push({
      key: `sundries-line-${item.description}-${item.unit_cost}`,
      name,
      rateDetail:
        item.qty === 1
          ? `1 @ ${formatCurrency(item.unit_cost)}`
          : `${item.qty} @ ${formatCurrency(item.unit_cost)}`,
      amount: extended,
    });
  }

  if (breakdown.overheadCostAtCost > 0) {
    const overheadName = isSundriesFixedAmount(overheadSettings)
      ? "Area sundries"
      : `Area sundries (${overheadSettings.materialsPct}%)`;
    items.push({
      key: "sundries-area-overhead",
      name: overheadName,
      rateDetail: `1 @ ${formatCurrency(breakdown.overheadCostAtCost)}`,
      amount: breakdown.overheadCostAtCost,
    });
  }

  return items;
}

function buildLaborItems(lineItems: TaggedLineItem[]): AreaMiniQuoteItem[] {
  let paintingHours = 0;
  let paintingCost = 0;
  let paintingRate = 0;
  let prepHours = 0;
  let prepCost = 0;
  let prepRate = 0;

  for (const item of lineItems) {
    if (item.type !== "labor" || item.is_optional) continue;
    const extended = roundMoney(item.qty * item.unit_cost);

    if (isPrepLaborLine(item)) {
      prepHours = roundMoney(prepHours + item.qty);
      prepCost = roundMoney(prepCost + extended);
      prepRate = item.unit_cost;
    } else {
      paintingHours = roundMoney(paintingHours + item.qty);
      paintingCost = roundMoney(paintingCost + extended);
      paintingRate = item.unit_cost;
    }
  }

  const items: AreaMiniQuoteItem[] = [];

  if (paintingHours > 0 || paintingCost > 0) {
    items.push({
      key: "labor-painting",
      name: "Painting labor",
      rateDetail: `${formatLaborHours(paintingHours)} @ ${formatCurrency(paintingRate)}/hr`,
      amount: paintingCost,
    });
  }

  if (prepHours > 0 || prepCost > 0) {
    items.push({
      key: "labor-prep",
      name: "Prep labor",
      rateDetail: `${formatLaborHours(prepHours)} @ ${formatCurrency(prepRate)}/hr`,
      amount: prepCost,
    });
  }

  return items;
}

export function buildAreaMiniQuote(
  lineItems: TaggedLineItem[],
  breakdown: AreaCostBreakdown,
  overheadSettings: AreaOverheadSettings,
): AreaMiniQuoteDocument {
  const sections: AreaMiniQuoteSection[] = [];

  const materials = mergeMaterialItems(lineItems);
  if (materials.length > 0) {
    sections.push({ key: "materials", title: "Materials", items: materials });
  }

  const sundries = buildSundriesItems(lineItems, breakdown, overheadSettings);
  if (sundries.length > 0) {
    sections.push({ key: "sundries", title: "Sundries", items: sundries });
  }

  const labor = buildLaborItems(lineItems);
  if (labor.length > 0) {
    sections.push({ key: "labor", title: "Labor", items: labor });
  }

  return {
    sections,
    total: breakdown.directCost,
  };
}
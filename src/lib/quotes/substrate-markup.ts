import type { LineItemInput } from "@/app/app/(portal)/quotes/actions";
import type { AreaSurfaceKey } from "@/lib/quotes/area-surface-catalog";
import { areaSurfaceByKey } from "@/lib/quotes/area-surface-catalog";
import { activeSubstrateDefinitionsForRoom } from "@/lib/quotes/area-custom-substrates";
import {
  listKeysForSubstrate,
  type AreaSubstrateDefinition,
  type AreaSubstrateId,
} from "@/lib/quotes/area-substrates";
import { readDefaultGrossMarginPct } from "@/lib/quotes/company-estimate-defaults";
import { isSundriesLineItem } from "@/lib/quotes/estimate-pricing-defaults";
import type { TaggedLineItem } from "@/lib/quotes/estimation/types";
import {
  lineItemLineTotal,
  markupAmountFromMargin,
  sellPriceFromMargin,
} from "@/lib/quotes/pricing";
import type { Company } from "@/types/database";

const SUBSTRATE_MARKUP_META = /^#substrate_markup=(.+)$/;

export type SubstrateMarkupKey = AreaSubstrateId | "sundries";
export type SubstrateMarkupMap = Partial<Record<SubstrateMarkupKey, number>>;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseRawPrepLines(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function isMetadataLine(line: string): boolean {
  return line.startsWith("#");
}

function prepMetadataLines(value: string | null | undefined): string[] {
  return parseRawPrepLines(value).filter(isMetadataLine);
}

function surfaceLabelsForSubstrate(
  substrate: AreaSubstrateDefinition,
): string[] {
  return listKeysForSubstrate(substrate)
    .map((key) => areaSurfaceByKey(key)?.label)
    .filter((label): label is string => Boolean(label));
}

export function lineItemMatchesSubstrate(
  item: Pick<TaggedLineItem, "description">,
  substrate: AreaSubstrateDefinition,
): boolean {
  if (isSundriesLineItem(item)) return false;

  const description = item.description;
  for (const label of surfaceLabelsForSubstrate(substrate)) {
    if (
      description.includes(` — ${label} (`) ||
      description.includes(` — ${label} —`)
    ) {
      return true;
    }
  }
  return false;
}

function parseSubstrateMarkupJson(
  prepWork: string | null | undefined,
): SubstrateMarkupMap | null {
  for (const line of parseRawPrepLines(prepWork)) {
    const match = line.match(SUBSTRATE_MARKUP_META);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;
      const map: SubstrateMarkupMap = {};
      for (const [key, value] of Object.entries(parsed)) {
        const pct = Number(value);
        if (Number.isFinite(pct) && pct >= 0) {
          map[key as SubstrateMarkupKey] = pct;
        }
      }
      return map;
    } catch {
      return null;
    }
  }
  return null;
}

export function resolveSubstrateMarkupMap(
  prepWork: string | null | undefined,
): SubstrateMarkupMap {
  return parseSubstrateMarkupJson(prepWork) ?? {};
}

export function resolveDefaultMarkupPct(
  company: Pick<Company, "default_margins">,
): number {
  return readDefaultGrossMarginPct(
    company.default_margins as Record<string, number> | null,
  );
}

export function getSubstrateMarkupPct(
  prepWork: string | null | undefined,
  substrateId: SubstrateMarkupKey,
  defaultMarkupPct: number,
): number {
  const stored = resolveSubstrateMarkupMap(prepWork)[substrateId];
  if (stored != null && stored >= 0) return stored;
  return defaultMarkupPct;
}

function serializePrepWorkWithSubstrateMarkup(
  prepWork: string | null | undefined,
  map: SubstrateMarkupMap,
): string {
  const meta = prepMetadataLines(prepWork).filter(
    (line) => !SUBSTRATE_MARKUP_META.test(line),
  );
  const hasMarkup = Object.keys(map).length > 0;
  if (hasMarkup) {
    meta.unshift(`#substrate_markup=${JSON.stringify(map)}`);
  }
  return meta.join("\n");
}

export function setSubstrateMarkupPct(
  prepWork: string | null | undefined,
  substrateId: SubstrateMarkupKey,
  markupPct: number,
  defaultMarkupPct: number,
): string {
  const map = { ...resolveSubstrateMarkupMap(prepWork) };
  const normalized = Math.max(0, Math.round(markupPct * 10) / 10);

  if (Math.abs(normalized - defaultMarkupPct) < 0.01) {
    delete map[substrateId];
  } else {
    map[substrateId] = normalized;
  }

  return serializePrepWorkWithSubstrateMarkup(prepWork, map);
}

export function markupAmountFromCost(
  costAtCost: number,
  marginPct: number,
): number {
  return markupAmountFromMargin(costAtCost, marginPct);
}

export function sellPriceFromCost(
  costAtCost: number,
  marginPct: number,
): number {
  return sellPriceFromMargin(costAtCost, marginPct);
}

export function activeSubstratesForRoom(
  surfaces: { room_index?: number; surface_key?: string | null }[],
  roomIndex: number,
  prepWork?: string | null,
): AreaSubstrateDefinition[] {
  const surfaceKeys = new Set<AreaSurfaceKey>();
  for (const surface of surfaces) {
    if (surface.room_index !== roomIndex || !surface.surface_key) continue;
    surfaceKeys.add(surface.surface_key as AreaSurfaceKey);
  }
  return activeSubstrateDefinitionsForRoom(prepWork, surfaceKeys);
}

function resolveMarkupForItem(
  item: TaggedLineItem,
  activeSubstrates: AreaSubstrateDefinition[],
  prepWork: string | null | undefined,
  defaultMarkupPct: number,
): number {
  if (isSundriesLineItem(item)) {
    return getSubstrateMarkupPct(prepWork, "sundries", defaultMarkupPct);
  }

  for (const substrate of activeSubstrates) {
    if (lineItemMatchesSubstrate(item, substrate)) {
      return getSubstrateMarkupPct(prepWork, substrate.id, defaultMarkupPct);
    }
  }

  return item.markup ?? defaultMarkupPct;
}

export function applySubstrateMarkupsToLineItems(
  items: TaggedLineItem[],
  activeSubstrates: AreaSubstrateDefinition[],
  prepWork: string | null | undefined,
  defaultMarkupPct: number,
): TaggedLineItem[] {
  return items.map((item) => ({
    ...item,
    markup: resolveMarkupForItem(
      item,
      activeSubstrates,
      prepWork,
      defaultMarkupPct,
    ),
  }));
}

export function updateLineItemsSubstrateMarkup(
  items: LineItemInput[],
  roomIndex: number,
  roomId: string | null | undefined,
  substrate: AreaSubstrateDefinition | null,
  markupPct: number,
  sundriesOnly = false,
): LineItemInput[] {
  return items.map((item) => {
    const linked = item.room_index === roomIndex || item.room_id === roomId;
    if (!linked) return item;

    if (sundriesOnly) {
      if (!isSundriesLineItem(item)) return item;
      return { ...item, markup: markupPct };
    }

    if (!substrate || isSundriesLineItem(item)) return item;
    if (!lineItemMatchesSubstrate(item, substrate)) return item;
    return { ...item, markup: markupPct };
  });
}

export function sumMarkedUpLineItems(
  items: Pick<TaggedLineItem, "qty" | "unit_cost" | "markup" | "is_optional">[],
  options?: { includeOptional?: boolean },
): { directCost: number; markupAmount: number; bidPrice: number } {
  let directCost = 0;
  let bidPrice = 0;

  for (const item of items) {
    if (!options?.includeOptional && item.is_optional) continue;
    const atCost = item.qty * item.unit_cost;
    directCost += atCost;
    bidPrice += lineItemLineTotal(item);
  }

  return {
    directCost: roundMoney(directCost),
    markupAmount: roundMoney(bidPrice - directCost),
    bidPrice: roundMoney(bidPrice),
  };
}
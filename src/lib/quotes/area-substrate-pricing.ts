import type { RoomInput, SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import type { AreaSurfaceKey } from "@/lib/quotes/area-surface-catalog";
import {
  type AreaSubstrateDefinition,
} from "@/lib/quotes/area-substrates";
import {
  summarizeSubstrate,
  type SubstrateSummary,
} from "@/lib/quotes/area-surface-metrics";
import { isSundriesLineItem } from "@/lib/quotes/estimate-pricing-defaults";
import type { TaggedLineItem } from "@/lib/quotes/estimation/types";
import type { QuotePaintDefaultInput } from "@/lib/quotes/paint-defaults";
import {
  getSubstrateMarkupPct,
  lineItemMatchesSubstrate,
  markupAmountFromCost,
  resolveDefaultMarkupPct,
  sellPriceFromCost,
  type SubstrateMarkupKey,
} from "@/lib/quotes/substrate-markup";
import type { Company, QuoteJobType } from "@/types/database";

export { lineItemMatchesSubstrate } from "@/lib/quotes/substrate-markup";

export type SubstratePricingRow = SubstrateSummary & {
  substrateId: AreaSubstrateDefinition["id"];
  costAtCost: number;
  marginPct: number;
  markupAmount: number;
  lineTotal: number;
};

export type AreaWorkItemsRollup = {
  substrateSummaries: SubstrateSummary[];
  substratePricingRows: SubstratePricingRow[];
  sundriesCost: number;
  sundriesMarginPct: number;
  sundriesMarkupAmount: number;
  sundriesLineTotal: number;
  substratesAtCost: number;
  reconciledDirectCost: number;
  totalMarkupAmount: number;
  totalSellPrice: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function isPrepLineItem(item: Pick<TaggedLineItem, "type" | "description">): boolean {
  if (item.type !== "labor") return false;
  const desc = item.description.toLowerCase();
  return desc.endsWith("(prep)") || desc.includes("surface prep");
}

function roomLineItems(
  lineItems: TaggedLineItem[],
  roomIndex: number,
  roomId?: string | null,
): TaggedLineItem[] {
  return lineItems.filter(
    (item) =>
      !item.is_optional &&
      (item.room_index === roomIndex || item.room_id === roomId),
  );
}

export function rollupAreaWorkItemsFromLineItems(
  lineItems: TaggedLineItem[],
  activeSubstrates: AreaSubstrateDefinition[],
  surfaces: Map<AreaSurfaceKey, SurfaceInput>,
  room: RoomInput,
  roomIndex: number,
  company: Company,
  jobType: QuoteJobType,
  paintProducts: CompanyPaintProductRow[],
  paintDefaults: QuotePaintDefaultInput[],
): AreaWorkItemsRollup {
  const scopedItems = roomLineItems(lineItems, roomIndex, room.id);

  let sundriesCost = 0;

  for (const item of scopedItems) {
    if (!isSundriesLineItem(item)) continue;
    sundriesCost += item.qty * item.unit_cost;
  }

  const substrateSummaries = activeSubstrates.map((substrate) => {
    let materialCost = 0;
    let laborCost = 0;
    let laborHours = 0;
    let prepHours = 0;

    for (const item of scopedItems) {
      if (!lineItemMatchesSubstrate(item, substrate)) continue;
      const atCost = item.qty * item.unit_cost;
      if (item.type === "material") {
        materialCost += atCost;
      } else if (item.type === "labor") {
        laborCost += atCost;
        if (isPrepLineItem(item)) {
          prepHours += item.qty;
        } else {
          laborHours += item.qty;
        }
      }
    }

    const display = summarizeSubstrate(
      substrate,
      surfaces,
      room,
      company,
      jobType,
      paintProducts,
      paintDefaults,
    );

    return {
      ...display,
      materialCost: roundMoney(materialCost),
      laborCost: roundMoney(laborCost > 0 ? laborCost : display.laborCost),
      laborHours:
        laborHours > 0 ? roundHours(laborHours) : display.laborHours,
      prepHours: prepHours > 0 ? roundHours(prepHours) : display.prepHours,
    };
  });

  const defaultMarkupPct = resolveDefaultMarkupPct(company);
  const markupMapKey = (id: SubstrateMarkupKey) =>
    getSubstrateMarkupPct(room.prep_work, id, defaultMarkupPct);

  const substratePricingRows: SubstratePricingRow[] = activeSubstrates.map(
    (substrate, index) => {
      const summary = substrateSummaries[index];
      const costAtCost = roundMoney(summary.materialCost + summary.laborCost);
      const marginPct = markupMapKey(substrate.id);
      const markupAmount = markupAmountFromCost(costAtCost, marginPct);
      const lineTotal = sellPriceFromCost(costAtCost, marginPct);
      return {
        ...summary,
        substrateId: substrate.id,
        costAtCost,
        marginPct,
        markupAmount,
        lineTotal,
      };
    },
  );

  const substratesAtCost = roundMoney(
    substratePricingRows.reduce((sum, row) => sum + row.costAtCost, 0),
  );
  const sundriesMarginPct = markupMapKey("sundries");
  const sundriesMarkupAmount = markupAmountFromCost(
    sundriesCost,
    sundriesMarginPct,
  );
  const sundriesLineTotal = sellPriceFromCost(sundriesCost, sundriesMarginPct);
  const reconciledDirectCost = roundMoney(substratesAtCost + sundriesCost);
  const totalMarkupAmount = roundMoney(
    substratePricingRows.reduce((sum, row) => sum + row.markupAmount, 0) +
      sundriesMarkupAmount,
  );
  const totalSellPrice = roundMoney(reconciledDirectCost + totalMarkupAmount);

  return {
    substrateSummaries,
    substratePricingRows,
    sundriesCost: roundMoney(sundriesCost),
    sundriesMarginPct,
    sundriesMarkupAmount,
    sundriesLineTotal,
    substratesAtCost,
    reconciledDirectCost,
    totalMarkupAmount,
    totalSellPrice,
  };
}
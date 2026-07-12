import type {
  LineItemInput,
  RoomInput,
  SurfaceInput,
} from "@/app/app/(portal)/quotes/actions";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import { buildLineItemsForArea } from "@/lib/quotes/estimation";
import type { QuoteEstimateContext, TaggedLineItem } from "@/lib/quotes/estimation/types";
import {
  isSundriesLineItem,
} from "@/lib/quotes/estimate-pricing-defaults";
import {
  computeAreaOverheadAtCost,
  resolveAreaOverhead,
} from "@/lib/quotes/area-overhead";
import {
  activeSubstratesForRoom,
  applySubstrateMarkupsToLineItems,
  markupAmountFromCost,
  resolveDefaultMarkupPct,
  sellPriceFromCost,
  sumMarkedUpLineItems,
} from "@/lib/quotes/substrate-markup";
import { computeSurfaceGallons } from "@/lib/quotes/surface-gallons";
import type { Company, QuoteJobType } from "@/types/database";

const FALLBACK_PAINT_COST_PER_GALLON = 45;

export type AreaCostBreakdown = {
  materialCostAtCost: number;
  sundriesCostAtCost: number;
  paintingLaborHours: number;
  prepLaborHours: number;
  totalLaborHours: number;
  laborCostAtCost: number;
  overheadCostAtCost: number;
  overheadMaterialsAmount: number;
  overheadLaborAmount: number;
  directCost: number;
  markupAmount: number;
  bidPrice: number;
  blendedLaborRatePerHour: number;
};

export type AreaPricingOptions = {
  /** Use persisted line items when present; otherwise preview from surfaces. */
  lineItems?: LineItemInput[];
  /** Ignore saved line items and estimate live from surfaces (area editor preview). */
  previewFromSurfaces?: boolean;
  /** Count line items marked optional (excluded areas) in area pricing. */
  includeOptionalLineItems?: boolean;
};

function isPrepLaborLine(
  item: Pick<TaggedLineItem, "type" | "description">,
): boolean {
  if (item.type !== "labor") return false;
  const desc = item.description.toLowerCase();
  return desc.endsWith("(prep)") || desc.includes("surface prep");
}

function areaLineItems(
  roomIndex: number,
  ctx: QuoteEstimateContext,
  options?: AreaPricingOptions,
): TaggedLineItem[] {
  const room = ctx.rooms[roomIndex];
  const linked = (options?.lineItems ?? []).filter(
    (item) =>
      item.room_index === roomIndex || item.room_id === room?.id,
  );

  if (!options?.previewFromSurfaces && linked.length > 0) {
    return linked.map((item) => ({
      ...item,
      source: (item.source ?? "surface") as TaggedLineItem["source"],
    }));
  }

  return buildLineItemsForArea(roomIndex, ctx);
}

export function getAreaLineItems(
  roomIndex: number,
  ctx: QuoteEstimateContext,
  options?: AreaPricingOptions,
): TaggedLineItem[] {
  return areaLineItems(roomIndex, ctx, options);
}

type ParsedLineItemCosts = Pick<
  AreaCostBreakdown,
  | "materialCostAtCost"
  | "sundriesCostAtCost"
  | "paintingLaborHours"
  | "prepLaborHours"
  | "totalLaborHours"
  | "laborCostAtCost"
>;

function parseLineItemCosts(
  items: TaggedLineItem[],
  options?: Pick<AreaPricingOptions, "includeOptionalLineItems">,
): ParsedLineItemCosts {
  let materialCostAtCost = 0;
  let sundriesCostAtCost = 0;
  let paintingLaborHours = 0;
  let prepLaborHours = 0;
  let paintingLaborCostAtCost = 0;
  let prepLaborCostAtCost = 0;

  for (const item of items) {
    if (!options?.includeOptionalLineItems && item.is_optional) continue;
    const atCost = item.qty * item.unit_cost;

    if (item.type === "material") {
      if (isSundriesLineItem(item)) {
        sundriesCostAtCost += atCost;
      } else {
        materialCostAtCost += atCost;
      }
      continue;
    }

    if (item.type === "labor") {
      if (isPrepLaborLine(item)) {
        prepLaborHours += item.qty;
        prepLaborCostAtCost += atCost;
      } else {
        paintingLaborHours += item.qty;
        paintingLaborCostAtCost += atCost;
      }
    }
  }

  const laborCostAtCost = paintingLaborCostAtCost + prepLaborCostAtCost;

  return {
    materialCostAtCost: roundMoney(materialCostAtCost),
    sundriesCostAtCost: roundMoney(sundriesCostAtCost),
    paintingLaborHours: roundHours(paintingLaborHours),
    prepLaborHours: roundHours(prepLaborHours),
    totalLaborHours: roundHours(paintingLaborHours + prepLaborHours),
    laborCostAtCost: roundMoney(laborCostAtCost),
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Paint + sundries at cost — matches the Materials tile in the area header. */
export function areaMaterialsAtCost(
  breakdown: Pick<AreaCostBreakdown, "materialCostAtCost" | "sundriesCostAtCost">,
): number {
  return roundMoney(breakdown.materialCostAtCost + breakdown.sundriesCostAtCost);
}

/** Direct cost from displayed material and labor parts (always sums cleanly). */
export function areaDirectCostFromParts(
  breakdown: Pick<
    AreaCostBreakdown,
    "materialCostAtCost" | "sundriesCostAtCost" | "laborCostAtCost"
  >,
): number {
  return roundMoney(
    breakdown.materialCostAtCost +
      breakdown.sundriesCostAtCost +
      breakdown.laborCostAtCost,
  );
}

export function computeAreaCostBreakdown(
  roomIndex: number,
  ctx: QuoteEstimateContext,
  options?: AreaPricingOptions,
): AreaCostBreakdown {
  const room = ctx.rooms[roomIndex];
  const items = areaLineItems(roomIndex, ctx, options);
  const parsed = parseLineItemCosts(items, options);
  const materialsAtCost = areaMaterialsAtCost(parsed);
  const overheadSettings = resolveAreaOverhead(room?.prep_work);
  const overheadParts = computeAreaOverheadAtCost(
    materialsAtCost,
    parsed.laborCostAtCost,
    overheadSettings,
  );
  const directCost = roundMoney(
    areaDirectCostFromParts(parsed) + overheadParts.total,
  );
  const defaultMarkupPct = resolveDefaultMarkupPct(ctx.company);
  const activeSubstrates = activeSubstratesForRoom(
    ctx.surfaces,
    roomIndex,
    room?.prep_work,
  );
  const markedItems = applySubstrateMarkupsToLineItems(
    items,
    activeSubstrates,
    room?.prep_work,
    defaultMarkupPct,
  );
  const priced = sumMarkedUpLineItems(markedItems, {
    includeOptional: options?.includeOptionalLineItems,
  });
  const overheadSell = sellPriceFromCost(
    overheadParts.total,
    defaultMarkupPct,
  );
  const overheadMarkup = markupAmountFromCost(
    overheadParts.total,
    defaultMarkupPct,
  );
  const blendedLaborRatePerHour =
    parsed.totalLaborHours > 0
      ? roundMoney(parsed.laborCostAtCost / parsed.totalLaborHours)
      : 0;

  return {
    ...parsed,
    overheadCostAtCost: overheadParts.total,
    overheadMaterialsAmount: overheadParts.materialsOverhead,
    overheadLaborAmount: overheadParts.laborOverhead,
    directCost,
    markupAmount: roundMoney(priced.markupAmount + overheadMarkup),
    bidPrice: roundMoney(priced.bidPrice + overheadSell),
    blendedLaborRatePerHour,
  };
}

export function computeAreaBidPrice(
  roomIndex: number,
  ctx: QuoteEstimateContext,
  options?: AreaPricingOptions,
): number {
  return computeAreaCostBreakdown(roomIndex, ctx, options).bidPrice;
}

/** Material cost at your unit cost for one surface row in the area modal. */
export function estimateSurfaceMaterialCostAtCost(
  surface: Pick<SurfaceInput, "surface_type" | "rate_type" | "sq_ft" | "coats">,
  product: Pick<CompanyPaintProductRow, "unit_cost" | "coverage_sqft_per_gallon"> | null,
  company: Pick<
    Company,
    "coverage_sqft_per_gallon" | "material_waste_pct" | "surface_labor_defaults"
  >,
  jobType: QuoteJobType = "interior",
): number {
  const gallons = computeSurfaceGallons(
    surface.sq_ft,
    surface.coats,
    surface.rate_type ?? "sqft",
    product,
    company,
    { surfaceType: surface.surface_type, jobType },
  );
  if (gallons <= 0) return 0;
  const unitCost = product?.unit_cost ?? FALLBACK_PAINT_COST_PER_GALLON;
  return roundMoney(gallons * unitCost);
}

export function sumAreaBidPrices(
  roomCount: number,
  ctx: QuoteEstimateContext,
  options?: AreaPricingOptions,
): number {
  let sum = 0;
  for (let i = 0; i < roomCount; i++) {
    sum += computeAreaBidPrice(i, ctx, options);
  }
  return sum;
}

/** @deprecated Use computeAreaBidPrice with QuoteEstimateContext */
export function computeAreaSubtotal(
  roomIndex: number,
  rooms: RoomInput[],
  surfaces: SurfaceInput[],
  lineItems: LineItemInput[],
  company: Company,
  jobType: QuoteJobType = "interior",
  options?: AreaPricingOptions & Pick<QuoteEstimateContext, "goodTierPaint" | "paintDefaults" | "baselineSystems" | "productsById">,
): number {
  const ctx: QuoteEstimateContext = {
    company,
    rooms,
    surfaces,
    manualItems: [],
    estimationMode: "hybrid",
    jobType,
    goodTierPaint: options?.goodTierPaint,
    paintDefaults: options?.paintDefaults,
    baselineSystems: options?.baselineSystems,
    productsById: options?.productsById,
  };
  return computeAreaBidPrice(roomIndex, ctx, {
    lineItems,
  });
}
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
import { readDefaultGrossMarginPct } from "@/lib/quotes/company-estimate-defaults";
import {
  calculateJobPricing,
  lineItemsDirectCostAtCost,
} from "@/lib/quotes/pricing";
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
  directCost: number;
  overheadPct: number;
  overheadAmount: number;
  loadedCost: number;
  grossMarginPct: number;
  bidPrice: number;
  blendedLaborRatePerHour: number;
};

export type AreaPricingOptions = {
  /** Use persisted line items when present; otherwise preview from surfaces. */
  lineItems?: LineItemInput[];
  grossMarginPct?: number;
};

function isPrepLaborLine(
  item: Pick<TaggedLineItem, "type" | "description">,
): boolean {
  return (
    item.type === "labor" &&
    item.description.toLowerCase().includes("prep")
  );
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

  if (linked.length > 0) {
    return linked.map((item) => ({
      ...item,
      source: (item.source ?? "surface") as TaggedLineItem["source"],
    }));
  }

  return buildLineItemsForArea(roomIndex, ctx);
}

function parseLineItemCosts(items: TaggedLineItem[]): Omit<
  AreaCostBreakdown,
  | "directCost"
  | "overheadPct"
  | "overheadAmount"
  | "loadedCost"
  | "grossMarginPct"
  | "bidPrice"
  | "blendedLaborRatePerHour"
> {
  let materialCostAtCost = 0;
  let sundriesCostAtCost = 0;
  let paintingLaborHours = 0;
  let prepLaborHours = 0;
  let paintingLaborCostAtCost = 0;
  let prepLaborCostAtCost = 0;

  for (const item of items) {
    if (item.is_optional) continue;
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

function resolveGrossMarginPct(
  company: Pick<Company, "default_margins">,
  override?: number,
): number {
  if (override != null && override >= 0 && override < 100) return override;
  return readDefaultGrossMarginPct(
    company.default_margins as Record<string, number> | null,
  );
}

export function computeAreaCostBreakdown(
  roomIndex: number,
  ctx: QuoteEstimateContext,
  options?: AreaPricingOptions,
): AreaCostBreakdown {
  const items = areaLineItems(roomIndex, ctx, options);
  const parsed = parseLineItemCosts(items);
  const directCost = lineItemsDirectCostAtCost(items, { excludeOptional: true });
  const overheadPct = ctx.company.overhead_pct ?? 0;
  const grossMarginPct = resolveGrossMarginPct(
    ctx.company,
    options?.grossMarginPct,
  );
  const pricing = calculateJobPricing(directCost, overheadPct, grossMarginPct);
  const blendedLaborRatePerHour =
    parsed.totalLaborHours > 0
      ? roundMoney(parsed.laborCostAtCost / parsed.totalLaborHours)
      : 0;

  return {
    ...parsed,
    directCost: roundMoney(directCost),
    overheadPct,
    overheadAmount: roundMoney(pricing.overhead),
    loadedCost: roundMoney(pricing.loadedCost),
    grossMarginPct,
    bidPrice: pricing.sellingPrice,
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
    grossMarginPct: options?.grossMarginPct,
  });
}
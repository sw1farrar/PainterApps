import type { ResolvedTierPaintConfig } from "@/lib/paint-library/types";
import { computePaintableSqFt } from "@/lib/quotes/paintable-sqft";
import { buildPaintMaterialLineItems } from "@/lib/quotes/estimation/paint-products";
import { getEstimatePricingDefaults } from "@/lib/quotes/estimate-pricing-defaults";
import { estimateDecimalGallons } from "@/lib/quotes/surface-gallons";
import {
  resolveSurfacePaintConfig,
  type SurfacePaintResolveContext,
} from "@/lib/quotes/resolve-surface-paint";
import { resolveSurfaceLaborOverride } from "@/lib/quotes/surface-labor-defaults";
import { DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON } from "@/lib/paint-library/coverage";
import {
  estimateSurfaceLaborHours,
  getLaborCostPerHour,
  resolveSurfaceLaborDefaultsFromCompany,
} from "@/lib/quotes/surface-productivity";
import type { RoomInput, SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import { surfaceDisplayLabel } from "@/lib/quotes/area-surface-catalog";
import type { Company, QuoteJobType } from "@/types/database";
import type { QuoteEstimateContext, TaggedLineItem } from "./types";

const BASE_PAINT_COST_PER_GALLON = 45;

const SQFT_PAINTABLE = new Set([
  "wall",
  "ceiling",
  "floor",
  "closet",
  "custom",
]);

function surfaceLabel(surface: SurfaceInput): string {
  return surfaceDisplayLabel(surface.surface_key, surface.surface_type);
}

function prepHoursForCondition(condition: string): number {
  if (condition === "poor") return 4;
  if (condition === "fair") return 2;
  if (condition === "good") return 1;
  return 0;
}

function paintResolveContext(
  ctx: Pick<
    QuoteEstimateContext,
    | "jobType"
    | "goodTierPaint"
    | "paintDefaults"
    | "baselineSystems"
    | "productsById"
  >,
): SurfacePaintResolveContext | null {
  if (!ctx.productsById?.size) return null;
  return {
    jobType: ctx.jobType ?? "interior",
    goodTierPaint: ctx.goodTierPaint,
    paintDefaults: ctx.paintDefaults,
    baselineSystems: ctx.baselineSystems,
    productsById: ctx.productsById,
  };
}

function appendFallbackMaterialItems(
  items: TaggedLineItem[],
  params: {
    paintableSqFt: number;
    surface: SurfaceInput;
    company: Company;
    jobType: QuoteJobType;
    materialMarkupPct: number;
    roomRef: string;
    label: string;
  },
): void {
  const { paintableSqFt, surface, company, jobType, materialMarkupPct, roomRef, label } =
    params;
  if (paintableSqFt <= 0) return;

  const coverage = DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON;
  const gallons = estimateDecimalGallons(
    paintableSqFt,
    surface.coats,
    coverage,
    0,
  );
  if (gallons <= 0) return;

  items.push({
    type: "material",
    description: `${roomRef} — ${label} paint & supplies`,
    qty: Math.ceil(gallons),
    unit_cost: BASE_PAINT_COST_PER_GALLON,
    markup: materialMarkupPct,
    source: "surface",
    room_index: surface.room_index,
    room_id: surface.room_id ?? null,
    is_optional: surface.is_optional,
    sort_order: (surface.sort_order ?? 0) + 1,
    company_paint_product_id: null,
    paint_role: null,
  });
}

function appendSurfaceMaterialItems(
  items: TaggedLineItem[],
  surface: SurfaceInput,
  paintableSqFt: number,
  company: Company,
  jobType: QuoteJobType,
  materialMarkupPct: number,
  roomRef: string,
  label: string,
  tierPaint: ResolvedTierPaintConfig | null,
): void {
  if (paintableSqFt <= 0) return;

  if (tierPaint?.topcoat) {
    const topcoatProduct = tierPaint.topcoat;
    items.push(
      ...buildPaintMaterialLineItems(
        paintableSqFt,
        tierPaint,
        company,
        materialMarkupPct,
        `${roomRef} — ${label}`,
      ).map((item) => ({
        ...item,
        room_index: surface.room_index,
        room_id: surface.room_id ?? null,
        is_optional: surface.is_optional,
        sort_order:
          (surface.sort_order ?? 0) + (item.paint_role === "topcoat" ? 1 : 0),
      })),
    );
    return;
  }

  appendFallbackMaterialItems(items, {
    paintableSqFt,
    surface,
    company,
    jobType,
    materialMarkupPct,
    roomRef,
    label,
  });
}

function surfacePaintableSqFt(
  surface: SurfaceInput,
  company: Company,
  jobType: QuoteJobType,
): number {
  const laborDefaults = resolveSurfaceLaborDefaultsFromCompany(company);
  const profile = resolveSurfaceLaborOverride(
    surface.surface_type,
    jobType,
    laborDefaults,
  );

  if (surface.rate_type === "sqft" || SQFT_PAINTABLE.has(surface.surface_type)) {
    return surface.sq_ft > 0 ? surface.sq_ft : 0;
  }

  return computePaintableSqFt(surface, profile);
}

function surfaceNeedsMaterials(surface: SurfaceInput): boolean {
  if (SQFT_PAINTABLE.has(surface.surface_type) && surface.sq_ft > 0) {
    return true;
  }
  if (surface.rate_type === "linear" && surface.sq_ft > 0) return true;
  if (surface.rate_type === "each" && surface.sq_ft > 0) return true;
  return false;
}

export function buildLineItemsFromSurfaces(
  surfaces: SurfaceInput[],
  company: Company,
  rooms: RoomInput[] = [],
  goodTierPaint?: ResolvedTierPaintConfig | null,
  jobType: QuoteJobType = "interior",
  estimateCtx?: Pick<
    QuoteEstimateContext,
    "paintDefaults" | "baselineSystems" | "productsById"
  >,
): TaggedLineItem[] {
  const { materialMarkupPct } = getEstimatePricingDefaults(company);
  const laborRates = company.labor_rates as Record<string, number>;
  const prepRate = laborRates.prep ?? 40;
  const paintingRate = getLaborCostPerHour(company);
  const items: TaggedLineItem[] = [];
  const prepAddedForRoom = new Set<number>();

  const paintCtx = estimateCtx?.productsById?.size
    ? paintResolveContext({
        jobType,
        goodTierPaint,
        paintDefaults: estimateCtx.paintDefaults,
        baselineSystems: estimateCtx.baselineSystems,
        productsById: estimateCtx.productsById,
      })
    : null;

  for (const surface of surfaces) {
    if (surface.sq_ft <= 0 && surface.rate_type !== "each") continue;

    const label = surfaceLabel(surface);
    const room =
      surface.room_index !== undefined ? rooms[surface.room_index] : undefined;
    const roomRef =
      room?.name?.trim() ||
      (surface.room_index !== undefined
        ? `Area ${surface.room_index + 1}`
        : "Area");

    items.push({
      type: "labor",
      description: `${roomRef} — ${label} (${surface.coats} coats)`,
      qty: estimateSurfaceLaborHours(
        surface,
        jobType,
        resolveSurfaceLaborDefaultsFromCompany(company),
      ),
      unit_cost: paintingRate,
      markup: 0,
      source: "surface",
      room_index: surface.room_index,
      room_id: surface.room_id ?? null,
      is_optional: surface.is_optional,
      sort_order: surface.sort_order,
      company_paint_product_id: null,
      paint_role: null,
    });

    if (surfaceNeedsMaterials(surface)) {
      const paintableSqFt = surfacePaintableSqFt(surface, company, jobType);
      const tierPaint =
        paintCtx != null
          ? resolveSurfacePaintConfig(surface, paintCtx)
          : goodTierPaint?.topcoat
            ? {
                ...goodTierPaint,
                topcoat_coats: surface.coats || goodTierPaint.topcoat_coats,
              }
            : null;

      appendSurfaceMaterialItems(
        items,
        surface,
        paintableSqFt,
        company,
        jobType,
        materialMarkupPct,
        roomRef,
        label,
        tierPaint,
      );
    }

    if (
      room &&
      surface.room_index !== undefined &&
      !prepAddedForRoom.has(surface.room_index)
    ) {
      const prepHours =
        prepHoursForCondition(room.condition) || (room.prep_work?.trim() ? 2 : 0);
      if (prepHours > 0) {
        prepAddedForRoom.add(surface.room_index);
        items.push({
          type: "labor",
          description: `${roomRef} — surface prep`,
          qty: prepHours,
          unit_cost: prepRate,
          markup: 0,
          source: "surface",
          room_index: surface.room_index,
          room_id: surface.room_id ?? room.id ?? null,
          is_optional: surface.is_optional,
          sort_order: (surface.sort_order ?? 0) + 2,
          company_paint_product_id: null,
          paint_role: null,
        });
      }
    }
  }

  return items;
}
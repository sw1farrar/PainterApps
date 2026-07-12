import type { RoomInput, SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import {
  areaSurfaceByKey,
  type AreaSurfaceKey,
} from "@/lib/quotes/area-surface-catalog";
import {
  listKeysForSubstrate,
  type AreaSubstrateDefinition,
} from "@/lib/quotes/area-substrates";
import {
  parseClosetDimensions,
  totalWallSqFtFromRoom,
} from "@/lib/quotes/area-surface-dimensions";
import { estimateSurfaceMaterialCostAtCost } from "@/lib/quotes/area-pricing";
import {
  paintDefaultsRecord,
  resolveSurfaceProductId,
  type QuotePaintDefaultInput,
} from "@/lib/quotes/paint-defaults";
import { substrateIdForSurfaceKey } from "@/lib/quotes/substrate-productivity";
import {
  resolveGallonsForSurface,
  resolveLaborHoursForSurface,
  resolvePrepHoursForSurface,
} from "@/lib/quotes/surface-overrides";
import {
  formatLaborHours,
  getLaborCostPerHour,
  resolveSurfaceLaborDefaultsFromCompany,
} from "@/lib/quotes/surface-productivity";
import { formatGallons } from "@/lib/quotes/surface-gallons";
import { formatCurrency } from "@/lib/utils";
import type { Company, QuoteJobType } from "@/types/database";

const WALL_KEYS: AreaSurfaceKey[] = [
  "wall-1",
  "wall-2",
  "wall-3",
  "wall-4",
];

export type SubstrateSummary = {
  label: string;
  qtyLabel: string;
  qty: number;
  coats: number;
  gallons: number;
  /** Painting labor hours only. */
  laborHours: number;
  prepHours: number;
  materialCost: number;
  laborCost: number;
  productName: string | null;
  detailLine: string | null;
};

/** Combined sq ft across all enabled surface rows in an area. */
export function totalSurfaceSqFt(
  surfaces: Pick<SurfaceInput, "sq_ft">[],
): number {
  const total = surfaces.reduce(
    (sum, surface) => sum + (surface.sq_ft ?? 0),
    0,
  );
  return Math.round(total * 100) / 100;
}

function prepCostPerHour(company: Company): number {
  const laborRates = company.labor_rates as Record<string, number> | null;
  return laborRates?.prep ?? 40;
}

function qtyLabelForRate(rate: "sqft" | "linear" | "each"): string {
  if (rate === "linear") return "Lin ft";
  if (rate === "each") return "Count";
  return "Sq ft";
}

function surfaceMetrics(
  surface: SurfaceInput,
  room: RoomInput,
  company: Company,
  jobType: QuoteJobType,
  products: CompanyPaintProductRow[],
  defaults: ReturnType<typeof paintDefaultsRecord>,
) {
  const definition = surface.surface_key
    ? areaSurfaceByKey(surface.surface_key)
    : null;
  const coats = surface.coats ?? room.coats ?? 2;
  const sqFt = surface.sq_ft ?? 0;
  const rateType = surface.rate_type ?? definition?.rate_type ?? "sqft";
  const productId = resolveSurfaceProductId(surface, defaults);
  const product = productId
    ? products.find((row) => row.id === productId) ?? null
    : null;
  const laborDefaults = resolveSurfaceLaborDefaultsFromCompany(company);
  const surfaceShape = {
    surface_type: surface.surface_type,
    rate_type: rateType,
    sq_ft: sqFt,
    coats,
    notes: surface.notes,
  };
  const gallons = resolveGallonsForSurface(
    surfaceShape,
    product,
    company,
    jobType,
  );
  const substrateId = surface.surface_key
    ? substrateIdForSurfaceKey(surface.surface_key, room.prep_work)
    : null;
  const laborHours = resolveLaborHoursForSurface(
    surfaceShape,
    jobType,
    laborDefaults,
    { prepWork: room.prep_work, substrateId },
  );
  const prepHours = resolvePrepHoursForSurface(surfaceShape);
  const unitCost = product?.unit_cost ?? 0;
  const materialCost =
    gallons > 0 && unitCost > 0
      ? Math.round(gallons * unitCost * 100) / 100
      : estimateSurfaceMaterialCostAtCost(
          {
            surface_type: surface.surface_type,
            rate_type: rateType,
            sq_ft: sqFt,
            coats,
          },
          product,
          company,
          jobType,
        );
  const laborRate = getLaborCostPerHour(company);
  const paintingCost =
    laborHours > 0 ? Math.round(laborHours * laborRate * 100) / 100 : 0;
  const prepCost =
    prepHours > 0
      ? Math.round(prepHours * prepCostPerHour(company) * 100) / 100
      : 0;
  const laborCost = Math.round((paintingCost + prepCost) * 100) / 100;

  return {
    coats,
    sqFt,
    rateType,
    gallons,
    laborHours,
    prepHours,
    materialCost,
    laborCost,
    productName: product?.name ?? null,
  };
}

export function summarizeSubstrate(
  substrate: AreaSubstrateDefinition,
  surfaces: Map<AreaSurfaceKey, SurfaceInput>,
  room: RoomInput,
  company: Company,
  jobType: QuoteJobType,
  products: CompanyPaintProductRow[],
  paintDefaults: QuotePaintDefaultInput[],
): SubstrateSummary {
  const defaults = paintDefaultsRecord(paintDefaults);
  const keys = listKeysForSubstrate(substrate);

  if (substrate.id === "walls") {
    const dimTotal = totalWallSqFtFromRoom(room);
    const wallSurfaces = WALL_KEYS.map((key) => surfaces.get(key)).filter(
      Boolean,
    ) as SurfaceInput[];
    const primary = wallSurfaces[0];
    const coats = primary?.coats ?? room.coats ?? 2;
    const qty =
      dimTotal > 0
        ? dimTotal
        : wallSurfaces.reduce((sum, row) => sum + (row.sq_ft ?? 0), 0);

    let gallons = 0;
    let laborHours = 0;
    let prepHours = 0;
    let materialCost = 0;
    let laborCost = 0;
    let productName: string | null = null;

    for (const surface of wallSurfaces) {
      const metrics = surfaceMetrics(
        surface,
        room,
        company,
        jobType,
        products,
        defaults,
      );
      gallons += metrics.gallons;
      laborHours += metrics.laborHours;
      prepHours += metrics.prepHours;
      materialCost += metrics.materialCost;
      laborCost += metrics.laborCost;
      if (!productName && metrics.productName) {
        productName = metrics.productName;
      }
    }

    if (wallSurfaces.length === 1 && primary) {
      const single = surfaceMetrics(
        { ...primary, sq_ft: qty },
        room,
        company,
        jobType,
        products,
        defaults,
      );
      gallons = single.gallons;
      laborHours = single.laborHours;
      prepHours = single.prepHours;
      materialCost = single.materialCost;
      laborCost = single.laborCost;
      productName = single.productName;
    }

    return {
      label: substrate.label,
      qtyLabel: "Sq ft",
      qty,
      coats,
      gallons: Math.round(gallons * 100) / 100,
      laborHours: Math.round(laborHours * 100) / 100,
      prepHours: Math.round(prepHours * 100) / 100,
      materialCost: Math.round(materialCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      productName,
      detailLine: null,
    };
  }

  const rows = keys
    .map((key) => surfaces.get(key))
    .filter(Boolean) as SurfaceInput[];

  let gallons = 0;
  let laborHours = 0;
  let prepHours = 0;
  let materialCost = 0;
  let laborCost = 0;
  let productName: string | null = null;
  let qty = 0;
  let coats = room.coats ?? 2;
  let qtyLabel = "Sq ft";

  for (const surface of rows) {
    const definition = surface.surface_key
      ? areaSurfaceByKey(surface.surface_key)
      : null;
    const metrics = surfaceMetrics(
      surface,
      room,
      company,
      jobType,
      products,
      defaults,
    );
    gallons += metrics.gallons;
    laborHours += metrics.laborHours;
    prepHours += metrics.prepHours;
    materialCost += metrics.materialCost;
    laborCost += metrics.laborCost;
    qty += metrics.sqFt;
    coats = metrics.coats;
    qtyLabel = qtyLabelForRate(metrics.rateType);
    if (!productName && metrics.productName) {
      productName = metrics.productName;
    }
  }

  let detailLine: string | null = null;
  if (substrate.id === "closets") {
    const closet = surfaces.get("closet");
    const dims = parseClosetDimensions(closet?.notes);
    detailLine = dims
      ? `${dims.length_ft}×${dims.width_ft}×${dims.height_ft} ft closet`
      : "Set closet dimensions";
  }

  return {
    label: substrate.label,
    qtyLabel,
    qty,
    coats,
    gallons: Math.round(gallons * 100) / 100,
    laborHours: Math.round(laborHours * 100) / 100,
    prepHours: Math.round(prepHours * 100) / 100,
    materialCost: Math.round(materialCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    productName: substrate.laborOnly ? null : productName,
    detailLine,
  };
}

export function formatSubstrateSummaryStats(summary: SubstrateSummary): string {
  const parts: string[] = [];
  if (summary.qty > 0) {
    parts.push(
      `${summary.qty.toLocaleString()} ${summary.qtyLabel.toLowerCase()}`,
    );
  }
  if (summary.coats > 0) {
    parts.push(`${summary.coats} coats`);
  }
  if (summary.gallons > 0) {
    parts.push(`${formatGallons(summary.gallons)} gal`);
  }
  if (summary.prepHours > 0) {
    parts.push(`${formatLaborHours(summary.prepHours)} prep`);
  }
  if (summary.laborHours > 0) {
    parts.push(`${formatLaborHours(summary.laborHours)} painting`);
  }
  if (summary.productName) {
    parts.push(summary.productName);
  }
  if (summary.materialCost > 0) {
    parts.push(`${formatCurrency(summary.materialCost)} materials`);
  }
  return parts.join(" · ");
}
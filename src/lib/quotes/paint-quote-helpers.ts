import type { SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import type {
  CompanyPaintProductRow,
  ResolvedTierPaintConfig,
  TierPaintConfigInput,
} from "@/lib/paint-library/types";
import { resolveTierPaintConfig, QUOTE_PAINT_TIERS } from "@/lib/paint-library/types";
import {
  computeMaterialBreakdown,
  computeTierDeltas,
} from "@/lib/quotes/estimation/paint-products";
import type { TierCostAdjustment } from "@/lib/quotes/pricing";
import type { Company } from "@/types/database";

const PAINTABLE_SURFACES = new Set([
  "wall",
  "ceiling",
  "floor",
  "closet",
  "custom",
]);

export function computePaintableSqFt(
  surfaces: SurfaceInput[],
  rooms: { sq_ft: number }[],
): number {
  const fromSurfaces = surfaces
    .filter(
      (s) =>
        PAINTABLE_SURFACES.has(s.surface_type ?? "custom") &&
        s.sq_ft > 0 &&
        !s.is_optional,
    )
    .reduce((sum, s) => sum + s.sq_ft, 0);

  if (fromSurfaces > 0) return fromSurfaces;

  return rooms
    .filter((r) => r.sq_ft > 0)
    .reduce((sum, r) => sum + r.sq_ft, 0);
}

export function buildProductsMap(
  products: CompanyPaintProductRow[],
): Map<string, CompanyPaintProductRow> {
  return new Map(products.map((p) => [p.id, p]));
}

export function resolveAllTierConfigs(
  tierPaintConfig: Record<string, TierPaintConfigInput>,
  productsById: Map<string, CompanyPaintProductRow>,
): Record<string, ResolvedTierPaintConfig> {
  const resolved: Record<string, ResolvedTierPaintConfig> = {};
  for (const tier of QUOTE_PAINT_TIERS) {
    const config = tierPaintConfig[tier];
    if (config) {
      resolved[tier] = resolveTierPaintConfig(config, productsById);
    }
  }
  return resolved;
}

export function computeTierAdjustments(
  tierPaintConfig: Record<string, TierPaintConfigInput>,
  products: CompanyPaintProductRow[],
  paintableSqFt: number,
  company: Company,
): Partial<Record<string, TierCostAdjustment>> {
  const productsById = buildProductsMap(products);
  const resolved = resolveAllTierConfigs(tierPaintConfig, productsById);
  const good = resolved.good;
  if (!good?.topcoat || paintableSqFt <= 0) return {};

  const materialMarkup = company.material_markup ?? 20;
  const goodBreakdown = computeMaterialBreakdown(
    paintableSqFt,
    good,
    company,
    materialMarkup,
  );

  const adjustments: Partial<Record<string, TierCostAdjustment>> = {
    good: { materialDelta: 0, laborDelta: 0 },
  };

  for (const tier of ["better", "best"] as const) {
    const alt = resolved[tier];
    if (!alt?.topcoat) continue;
    const altBreakdown = computeMaterialBreakdown(
      paintableSqFt,
      alt,
      company,
      materialMarkup,
    );
    const deltas = computeTierDeltas(
      goodBreakdown,
      altBreakdown,
      tierPaintConfig.good,
      tierPaintConfig[tier],
      company,
    );
    adjustments[tier] = {
      materialDelta: deltas.materialDelta,
      laborDelta: deltas.laborDelta,
    };
  }

  return adjustments;
}
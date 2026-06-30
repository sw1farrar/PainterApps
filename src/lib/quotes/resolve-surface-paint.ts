import type { SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import {
  emptyTierPaintConfig,
  resolveTierPaintConfig,
  type CompanyPaintProductRow,
  type ResolvedTierPaintConfig,
  type TierPaintConfigInput,
} from "@/lib/paint-library/types";
import {
  primaryBaselineScope,
  type BaselinePaintSystemInput,
  type BaselineSurfaceCategory,
} from "@/lib/quotes/baseline-paint";
import {
  paintDefaultTypeForSurfaceKey,
  type QuotePaintDefaultInput,
} from "@/lib/quotes/paint-defaults";
import type { QuoteJobType, QuoteSurfaceKind } from "@/types/database";

function surfaceKindToBaselineCategory(
  kind: QuoteSurfaceKind,
): BaselineSurfaceCategory | null {
  if (
    kind === "wall" ||
    kind === "floor" ||
    kind === "closet" ||
    kind === "custom"
  ) {
    return "wall";
  }
  if (kind === "ceiling") return "ceiling";
  if (kind === "trim") return "trim";
  if (kind === "door") return "door";
  if (kind === "window") return "trim";
  return "wall";
}

export function tierConfigFromBaselineRow(
  row: BaselinePaintSystemInput,
): TierPaintConfigInput {
  return {
    tier: "good",
    primer_product_id: row.primer_product_id,
    topcoat_product_id: row.topcoat_product_id,
    primer_coats: row.primer_coats,
    topcoat_coats: row.topcoat_coats,
    primer_spot_prime: row.primer_spot_prime,
    labor_hours_delta_pct: 0,
    labor_hours_delta_hours: 0,
    prep_hours_delta: 0,
    value_add_features: [],
  };
}

export type SurfacePaintResolveContext = {
  jobType: QuoteJobType;
  goodTierPaint?: ResolvedTierPaintConfig | null;
  paintDefaults?: QuotePaintDefaultInput[];
  baselineSystems?: BaselinePaintSystemInput[];
  productsById: Map<string, CompanyPaintProductRow>;
};

export function resolveSurfacePaintConfig(
  surface: Pick<
    SurfaceInput,
    "surface_type" | "surface_key" | "company_paint_product_id" | "coats"
  >,
  ctx: SurfacePaintResolveContext,
): ResolvedTierPaintConfig | null {
  const { productsById, jobType } = ctx;
  const scope = primaryBaselineScope(jobType);

  if (surface.company_paint_product_id) {
    const topcoat = productsById.get(surface.company_paint_product_id) ?? null;
    if (!topcoat) return null;
    const config: TierPaintConfigInput = {
      ...emptyTierPaintConfig("good"),
      topcoat_product_id: topcoat.id,
      topcoat_coats: surface.coats || 2,
    };
    return resolveTierPaintConfig(config, productsById);
  }

  if (ctx.paintDefaults?.length) {
    const kind = paintDefaultTypeForSurfaceKey(
      surface.surface_key,
      surface.surface_type,
    );
    const row = ctx.paintDefaults.find((d) => d.surface_type === kind);
    if (row?.company_paint_product_id) {
      const config: TierPaintConfigInput = {
        ...emptyTierPaintConfig("good"),
        topcoat_product_id: row.company_paint_product_id,
        topcoat_coats: row.coats || surface.coats || 2,
      };
      return resolveTierPaintConfig(config, productsById);
    }
  }

  if (ctx.baselineSystems?.length) {
    const category = surfaceKindToBaselineCategory(surface.surface_type);
    if (category) {
      const row = ctx.baselineSystems.find(
        (r) =>
          r.application_scope === scope && r.surface_category === category,
      );
      if (row?.topcoat_product_id) {
        const config = tierConfigFromBaselineRow(row);
        config.topcoat_coats = surface.coats || config.topcoat_coats;
        return resolveTierPaintConfig(config, productsById);
      }
    }
  }

  if (ctx.goodTierPaint?.topcoat) {
    return {
      ...ctx.goodTierPaint,
      topcoat_coats: surface.coats || ctx.goodTierPaint.topcoat_coats,
    };
  }

  return null;
}
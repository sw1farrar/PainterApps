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
  trimBaselinePaintSystem,
  type QuotePaintDefaultInput,
} from "@/lib/quotes/paint-defaults";
import { resolvePrimerProductIdForSurface } from "@/lib/quotes/surface-overrides";
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

function baselineRowForSurface(
  surface: Pick<SurfaceInput, "surface_type">,
  ctx: SurfacePaintResolveContext,
): BaselinePaintSystemInput | null {
  if (!ctx.baselineSystems?.length) return null;
  const scope = primaryBaselineScope(ctx.jobType);
  const category = surfaceKindToBaselineCategory(surface.surface_type);
  if (!category) return null;
  return (
    ctx.baselineSystems.find(
      (row) =>
        row.application_scope === scope && row.surface_category === category,
    ) ?? null
  );
}

function defaultTopcoatProductId(
  surface: Pick<
    SurfaceInput,
    "surface_type" | "surface_key" | "company_paint_product_id"
  >,
  ctx: SurfacePaintResolveContext,
): string | null {
  const kind = paintDefaultTypeForSurfaceKey(
    surface.surface_key,
    surface.surface_type,
  );
  const paintDefault = ctx.paintDefaults?.find((row) => row.surface_type === kind);
  if (paintDefault?.company_paint_product_id) {
    return paintDefault.company_paint_product_id;
  }
  return baselineRowForSurface(surface, ctx)?.topcoat_product_id ?? null;
}

function applyWindowPrimer(
  config: TierPaintConfigInput,
  surface: Pick<SurfaceInput, "surface_type" | "notes">,
  ctx: SurfacePaintResolveContext,
): TierPaintConfigInput {
  if (surface.surface_type !== "window") return config;

  const primerFromNotes = resolvePrimerProductIdForSurface(surface);
  if (primerFromNotes) {
    const trim = trimBaselinePaintSystem(ctx.baselineSystems, ctx.jobType);
    return {
      ...config,
      primer_product_id: primerFromNotes,
      primer_coats: trim?.primer_coats ?? config.primer_coats,
      primer_spot_prime: trim?.primer_spot_prime ?? config.primer_spot_prime,
    };
  }

  const trim = trimBaselinePaintSystem(ctx.baselineSystems, ctx.jobType);
  if (trim?.primer_product_id && !config.primer_product_id) {
    return {
      ...config,
      primer_product_id: trim.primer_product_id,
      primer_coats: trim.primer_coats,
      primer_spot_prime: trim.primer_spot_prime,
    };
  }

  return config;
}

export function resolveSurfacePaintConfig(
  surface: Pick<
    SurfaceInput,
    | "surface_type"
    | "surface_key"
    | "company_paint_product_id"
    | "coats"
    | "notes"
  >,
  ctx: SurfacePaintResolveContext,
): ResolvedTierPaintConfig | null {
  const { productsById } = ctx;

  if (surface.company_paint_product_id) {
    const selected =
      productsById.get(surface.company_paint_product_id) ?? null;
    if (!selected) return null;

    if (surface.surface_type === "window" && selected.role === "primer") {
      const config = applyWindowPrimer(
        {
          ...emptyTierPaintConfig("good"),
          primer_product_id: selected.id,
          topcoat_coats: surface.coats || 2,
          topcoat_product_id: defaultTopcoatProductId(surface, ctx),
        },
        surface,
        ctx,
      );
      return resolveTierPaintConfig(config, productsById);
    }

    const config = applyWindowPrimer(
      {
        ...emptyTierPaintConfig("good"),
        topcoat_product_id: selected.id,
        topcoat_coats: surface.coats || 2,
      },
      surface,
      ctx,
    );
    return resolveTierPaintConfig(config, productsById);
  }

  if (ctx.paintDefaults?.length) {
    const kind = paintDefaultTypeForSurfaceKey(
      surface.surface_key,
      surface.surface_type,
    );
    const row = ctx.paintDefaults.find((d) => d.surface_type === kind);
    if (row?.company_paint_product_id) {
      const config = applyWindowPrimer(
        {
          ...emptyTierPaintConfig("good"),
          topcoat_product_id: row.company_paint_product_id,
          topcoat_coats: row.coats || surface.coats || 2,
        },
        surface,
        ctx,
      );
      return resolveTierPaintConfig(config, productsById);
    }
  }

  const baselineRow = baselineRowForSurface(surface, ctx);
  if (baselineRow?.topcoat_product_id) {
    const config = tierConfigFromBaselineRow(baselineRow);
    config.topcoat_coats = surface.coats || config.topcoat_coats;
    return resolveTierPaintConfig(
      applyWindowPrimer(config, surface, ctx),
      productsById,
    );
  }

  if (ctx.goodTierPaint?.topcoat) {
    return {
      ...ctx.goodTierPaint,
      topcoat_coats: surface.coats || ctx.goodTierPaint.topcoat_coats,
    };
  }

  return null;
}
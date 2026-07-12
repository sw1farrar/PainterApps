import type { SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import {
  primaryBaselineScope,
  type BaselinePaintSystemInput,
} from "@/lib/quotes/baseline-paint";
import {
  PAINT_DEFAULT_OPTIONS,
  type AreaSurfaceKey,
} from "@/lib/quotes/area-surface-catalog";
import type { CompanyPaintProductRole, QuoteJobType, QuoteSurfaceKind } from "@/types/database";

export type QuotePaintDefaultInput = {
  surface_type: QuoteSurfaceKind;
  company_paint_product_id: string | null;
  coats: number;
};

export const PAINT_DEFAULT_SURFACE_KINDS: QuoteSurfaceKind[] =
  PAINT_DEFAULT_OPTIONS.map((option) => option.surface_type);

export function emptyPaintDefaults(): QuotePaintDefaultInput[] {
  return PAINT_DEFAULT_SURFACE_KINDS.map((surface_type) => ({
    surface_type,
    company_paint_product_id: null,
    coats: 2,
  }));
}

/** Ensure every paint-default kind exists — DB loads and partial saves may omit rows. */
export function normalizeQuotePaintDefaults(
  defaults: QuotePaintDefaultInput[] | null | undefined,
): QuotePaintDefaultInput[] {
  const record = paintDefaultsRecord(defaults ?? []);
  return PAINT_DEFAULT_SURFACE_KINDS.map((surface_type) => ({
    surface_type,
    company_paint_product_id:
      record[surface_type]?.company_paint_product_id ?? null,
    coats: record[surface_type]?.coats ?? 2,
  }));
}

export function paintDefaultsRecord(
  defaults: QuotePaintDefaultInput[],
): Record<QuoteSurfaceKind, QuotePaintDefaultInput> {
  const record = {} as Record<QuoteSurfaceKind, QuotePaintDefaultInput>;
  for (const row of defaults) {
    record[row.surface_type] = row;
  }
  for (const kind of PAINT_DEFAULT_SURFACE_KINDS) {
    if (!record[kind]) {
      record[kind] = {
        surface_type: kind,
        company_paint_product_id: null,
        coats: 2,
      };
    }
  }
  return record;
}

export function paintDefaultTypeForSurfaceKey(
  surfaceKey: string | null | undefined,
  surfaceType: QuoteSurfaceKind | undefined,
): QuoteSurfaceKind {
  if (surfaceKey === "closet-ceiling") return "ceiling";
  if (surfaceKey === "shelf") return "trim";
  if (surfaceKey?.startsWith("wall-")) return "wall";
  if (
    surfaceKey &&
    PAINT_DEFAULT_SURFACE_KINDS.includes(surfaceKey as QuoteSurfaceKind)
  ) {
    return surfaceKey as QuoteSurfaceKind;
  }
  return surfaceType ?? "wall";
}

export function resolveSurfaceProductId(
  surface: Pick<
    SurfaceInput,
    "surface_type" | "surface_key" | "company_paint_product_id" | "product_override"
  >,
  defaults: Record<QuoteSurfaceKind, QuotePaintDefaultInput>,
): string | null {
  if (surface.company_paint_product_id) {
    return surface.company_paint_product_id;
  }
  const kind = paintDefaultTypeForSurfaceKey(
    surface.surface_key,
    surface.surface_type,
  );
  return defaults[kind]?.company_paint_product_id ?? null;
}

export function resolveSurfaceCoats(
  surface: Pick<SurfaceInput, "surface_type" | "surface_key" | "coats" | "product_override">,
  defaults: Record<QuoteSurfaceKind, QuotePaintDefaultInput>,
  roomCoats: number,
): number {
  if (surface.coats > 0) return surface.coats;
  const kind = paintDefaultTypeForSurfaceKey(
    surface.surface_key,
    surface.surface_type,
  );
  return defaults[kind]?.coats ?? roomCoats ?? 2;
}

export function surfaceKeysForPaintDefault(
  surfaceType: QuoteSurfaceKind,
): AreaSurfaceKey[] {
  if (surfaceType === "wall") {
    return ["wall-1", "wall-2", "wall-3", "wall-4"];
  }
  if (surfaceType === "ceiling") return ["ceiling"];
  if (surfaceType === "floor") return ["floor"];
  if (surfaceType === "door") return ["door"];
  if (surfaceType === "closet") return ["closet"];
  if (surfaceType === "trim") return ["trim"];
  if (surfaceType === "window") return ["window"];
  return [];
}

export function applyDefaultsToSurfaces(
  surfaces: SurfaceInput[],
  defaults: QuotePaintDefaultInput[],
  onlyNonOverridden = true,
): SurfaceInput[] {
  const record = paintDefaultsRecord(defaults);
  return surfaces.map((surface) => {
    if (onlyNonOverridden && surface.product_override) return surface;
    const kind = paintDefaultTypeForSurfaceKey(
      surface.surface_key,
      surface.surface_type,
    );
    const def = record[kind];
    if (!def?.company_paint_product_id) return surface;
    return {
      ...surface,
      company_paint_product_id: def.company_paint_product_id,
      coats: surface.coats || def.coats,
      product_override: false,
    };
  });
}

export function inferInitialPaintDefaults(
  products: CompanyPaintProductRow[],
): QuotePaintDefaultInput[] {
  const topcoats = products.filter(
    (p) => p.is_active && p.role === "topcoat",
  );
  const fallback = topcoats[0]?.id ?? null;

  return PAINT_DEFAULT_SURFACE_KINDS.map((surface_type) => ({
    surface_type,
    company_paint_product_id: fallback,
    coats: 2,
  }));
}

export function productsForPaintRole(
  products: CompanyPaintProductRow[],
  jobType: QuoteJobType,
  role: CompanyPaintProductRole,
  selectedProductId?: string | null,
): CompanyPaintProductRow[] {
  const scope = primaryBaselineScope(jobType);
  const filtered = products.filter((product) => {
    if (!product.is_active || product.role !== role) return false;
    const app = product.application_type ?? "interior";
    if (scope === "interior") {
      return app === "interior" || app === "both";
    }
    return app === "exterior" || app === "both";
  });
  if (!selectedProductId) return filtered;
  if (filtered.some((product) => product.id === selectedProductId)) {
    return filtered;
  }
  const selected = products.find(
    (product) => product.id === selectedProductId && product.role === role,
  );
  return selected ? [selected, ...filtered] : filtered;
}

export function trimBaselinePaintSystem(
  systems: BaselinePaintSystemInput[] | null | undefined,
  jobType: QuoteJobType,
): BaselinePaintSystemInput | null {
  if (!systems?.length) return null;
  const scope = primaryBaselineScope(jobType);
  return (
    systems.find(
      (row) =>
        row.application_scope === scope && row.surface_category === "trim",
    ) ?? null
  );
}

export function defaultPrimerProductIdForWindow(
  systems: BaselinePaintSystemInput[] | null | undefined,
  jobType: QuoteJobType,
): string | null {
  return trimBaselinePaintSystem(systems, jobType)?.primer_product_id ?? null;
}

export function productsForSurfaceKind(
  products: CompanyPaintProductRow[],
  surfaceType: QuoteSurfaceKind,
  jobType: QuoteJobType = "interior",
): CompanyPaintProductRow[] {
  if (surfaceType === "window") {
    return productsForPaintRole(products, jobType, "topcoat");
  }
  const active = products.filter((p) => p.is_active);
  const primersAndTopcoats = active.filter(
    (p) => p.role === "primer" || p.role === "topcoat",
  );
  if (primersAndTopcoats.length > 0) return primersAndTopcoats;
  return active;
}
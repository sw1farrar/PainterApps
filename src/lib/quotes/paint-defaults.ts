import type { SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import {
  PAINT_DEFAULT_OPTIONS,
  type AreaSurfaceKey,
} from "@/lib/quotes/area-surface-catalog";
import type { QuoteSurfaceKind } from "@/types/database";

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
  const primers = products.filter((p) => p.is_active && p.role === "primer");
  const fallback = topcoats[0]?.id ?? null;

  return PAINT_DEFAULT_SURFACE_KINDS.map((surface_type) => {
    let productId = fallback;
    if (surface_type === "window" && primers[0]) {
      productId = primers[0].id;
    }
    return {
      surface_type,
      company_paint_product_id: productId,
      coats: 2,
    };
  });
}

export function productsForSurfaceKind(
  products: CompanyPaintProductRow[],
  surfaceType: QuoteSurfaceKind,
): CompanyPaintProductRow[] {
  const active = products.filter((p) => p.is_active);
  if (surfaceType === "window") {
    const primers = active.filter((p) => p.role === "primer");
    if (primers.length > 0) return primers;
  }
  const primersAndTopcoats = active.filter(
    (p) => p.role === "primer" || p.role === "topcoat",
  );
  if (primersAndTopcoats.length > 0) return primersAndTopcoats;
  return active;
}
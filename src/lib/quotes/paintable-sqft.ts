import type { SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import type { SurfaceLaborOverride } from "@/lib/quotes/surface-labor-defaults";
import type { QuoteSurfaceKind } from "@/types/database";

export const DEFAULT_TRIM_PROFILE_WIDTH_INCHES = 4;
export const DEFAULT_DOOR_WIDTH_INCHES = 36;
export const DEFAULT_DOOR_HEIGHT_INCHES = 80;
export const DEFAULT_WINDOW_WIDTH_INCHES = 36;
export const DEFAULT_WINDOW_HEIGHT_INCHES = 48;

function defaultUnitWidthInches(surfaceType: QuoteSurfaceKind): number {
  return surfaceType === "door"
    ? DEFAULT_DOOR_WIDTH_INCHES
    : DEFAULT_WINDOW_WIDTH_INCHES;
}

function defaultUnitHeightInches(surfaceType: QuoteSurfaceKind): number {
  return surfaceType === "door"
    ? DEFAULT_DOOR_HEIGHT_INCHES
    : DEFAULT_WINDOW_HEIGHT_INCHES;
}

function defaultPaintedSides(surfaceType: QuoteSurfaceKind): number {
  return surfaceType === "door" ? 2 : 1;
}

/** Paintable area in sq ft for material gallon calculations. */
export function computePaintableSqFt(
  surface: Pick<SurfaceInput, "surface_type" | "rate_type" | "sq_ft">,
  profile: SurfaceLaborOverride,
): number {
  const qty = surface.sq_ft ?? 0;
  if (qty <= 0 && surface.rate_type !== "each") return 0;

  if (surface.rate_type === "linear") {
    const widthIn =
      profile.profileWidthInches ?? DEFAULT_TRIM_PROFILE_WIDTH_INCHES;
    if (widthIn <= 0) return qty;
    return Math.round(qty * (widthIn / 12) * 100) / 100;
  }

  if (surface.rate_type === "each") {
    const count = Math.max(qty, 1);
    const widthIn =
      profile.unitWidthInches ?? defaultUnitWidthInches(surface.surface_type);
    const heightIn =
      profile.unitHeightInches ?? defaultUnitHeightInches(surface.surface_type);
    const sides =
      profile.paintedSides ?? defaultPaintedSides(surface.surface_type);
    if (widthIn <= 0 || heightIn <= 0) return 0;
    const perUnit = (widthIn / 12) * (heightIn / 12) * Math.max(sides, 1);
    return Math.round(count * perUnit * 100) / 100;
  }

  return qty;
}
import type { QuoteRateType, QuoteSurfaceKind } from "@/types/database";

export type AreaSurfaceKey =
  | "wall-1"
  | "wall-2"
  | "wall-3"
  | "wall-4"
  | "ceiling"
  | "floor"
  | "door"
  | "closet"
  | "closet-ceiling"
  | "trim"
  | "window";

export type AreaSurfaceDefinition = {
  key: AreaSurfaceKey;
  label: string;
  surface_type: QuoteSurfaceKind;
  rate_type: QuoteRateType;
  /** Which project paint default row applies to this line. */
  paint_default_type: QuoteSurfaceKind;
  opensClosetModal?: boolean;
  /** Added/removed automatically with another surface (e.g. closet ceiling with closet). */
  companionOf?: AreaSurfaceKey;
};

export const AREA_SURFACE_CATALOG: AreaSurfaceDefinition[] = [
  {
    key: "wall-1",
    label: "Wall 1",
    surface_type: "wall",
    rate_type: "sqft",
    paint_default_type: "wall",
  },
  {
    key: "wall-2",
    label: "Wall 2",
    surface_type: "wall",
    rate_type: "sqft",
    paint_default_type: "wall",
  },
  {
    key: "wall-3",
    label: "Wall 3",
    surface_type: "wall",
    rate_type: "sqft",
    paint_default_type: "wall",
  },
  {
    key: "wall-4",
    label: "Wall 4",
    surface_type: "wall",
    rate_type: "sqft",
    paint_default_type: "wall",
  },
  {
    key: "ceiling",
    label: "Ceiling",
    surface_type: "ceiling",
    rate_type: "sqft",
    paint_default_type: "ceiling",
  },
  {
    key: "floor",
    label: "Floor",
    surface_type: "floor",
    rate_type: "sqft",
    paint_default_type: "floor",
  },
  {
    key: "door",
    label: "Doors",
    surface_type: "door",
    rate_type: "each",
    paint_default_type: "door",
  },
  {
    key: "closet",
    label: "Closet walls",
    surface_type: "closet",
    rate_type: "sqft",
    paint_default_type: "closet",
    opensClosetModal: true,
  },
  {
    key: "closet-ceiling",
    label: "Closet ceiling",
    surface_type: "ceiling",
    rate_type: "sqft",
    paint_default_type: "ceiling",
    companionOf: "closet",
  },
  {
    key: "trim",
    label: "Trim",
    surface_type: "trim",
    rate_type: "linear",
    paint_default_type: "trim",
  },
  {
    key: "window",
    label: "Windows",
    surface_type: "window",
    rate_type: "each",
    paint_default_type: "window",
  },
];

export type PaintDefaultOption = {
  surface_type: QuoteSurfaceKind;
  label: string;
};

export const PAINT_DEFAULT_OPTIONS: PaintDefaultOption[] = [
  { surface_type: "wall", label: "Walls" },
  { surface_type: "ceiling", label: "Ceiling" },
  { surface_type: "floor", label: "Floor" },
  { surface_type: "door", label: "Doors" },
  { surface_type: "closet", label: "Closet" },
  { surface_type: "trim", label: "Trim" },
  { surface_type: "window", label: "Windows" },
];

export const CLOSET_COMPANION_KEYS: AreaSurfaceKey[] = ["closet-ceiling"];

export function areaSurfaceByKey(key: string): AreaSurfaceDefinition | undefined {
  return AREA_SURFACE_CATALOG.find((row) => row.key === key);
}

export function isClosetCompanionKey(key: string): boolean {
  return CLOSET_COMPANION_KEYS.includes(key as AreaSurfaceKey);
}

export function surfaceDisplayLabel(
  surfaceKey: string | null | undefined,
  surfaceType: QuoteSurfaceKind | undefined,
): string {
  if (surfaceKey) {
    const row = areaSurfaceByKey(surfaceKey);
    if (row) return row.label;
  }
  const kind = surfaceType ?? "custom";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}
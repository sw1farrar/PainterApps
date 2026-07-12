import type { AreaSurfaceKey } from "@/lib/quotes/area-surface-catalog";

export type CustomSubstrateId = `custom-${string}`;

export type BuiltInSubstrateId =
  | "walls"
  | "trim"
  | "ceilings"
  | "windows"
  | "doors"
  | "closets"
  | "cabinets"
  | "shelves"
  | "floors";

export type AreaSubstrateId = BuiltInSubstrateId | CustomSubstrateId;

export type AreaSubstrateDefinition = {
  id: AreaSubstrateId;
  label: string;
  /** Surface keys toggled by this pill (companions auto-managed). */
  toggleKeys: AreaSurfaceKey[];
  /** Show one combined row instead of per-key rows. */
  groupDisplay?: boolean;
  /** Companion surfaces listed under this substrate when active. */
  companionKeys?: AreaSurfaceKey[];
  /** Hide paint product picker (labor-only). */
  laborOnly?: boolean;
};

export const AREA_SUBSTRATES: AreaSubstrateDefinition[] = [
  {
    id: "walls",
    label: "Walls",
    toggleKeys: ["wall-1", "wall-2", "wall-3", "wall-4"],
    groupDisplay: true,
  },
  { id: "trim", label: "Trim", toggleKeys: ["trim"] },
  { id: "ceilings", label: "Ceilings", toggleKeys: ["ceiling"] },
  { id: "windows", label: "Windows", toggleKeys: ["window"] },
  { id: "doors", label: "Doors", toggleKeys: ["door"] },
  {
    id: "closets",
    label: "Closets",
    toggleKeys: ["closet"],
    companionKeys: ["closet-ceiling"],
  },
  { id: "cabinets", label: "Cabinets", toggleKeys: ["cabinet"] },
  { id: "shelves", label: "Shelves", toggleKeys: ["shelf"] },
  { id: "floors", label: "Floors", toggleKeys: ["floor"] },
];

export function substrateById(
  id: AreaSubstrateId,
): AreaSubstrateDefinition | undefined {
  return AREA_SUBSTRATES.find((row) => row.id === id);
}

export function isSubstrateActive(
  substrate: AreaSubstrateDefinition,
  activeKeys: Set<AreaSurfaceKey>,
): boolean {
  return substrate.toggleKeys.some((key) => activeKeys.has(key));
}

export function listKeysForSubstrate(
  substrate: AreaSubstrateDefinition,
): AreaSurfaceKey[] {
  return [...substrate.toggleKeys, ...(substrate.companionKeys ?? [])];
}
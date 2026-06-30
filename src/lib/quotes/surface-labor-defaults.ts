import type { QuoteJobType, QuoteSurfaceKind } from "@/types/database";
import {
  buildSystemSurfaceLaborProfiles,
  getSurfaceLaborSystemDefaultMeta,
  getSystemSurfaceLaborValues,
  type SurfaceLaborScope,
} from "@/lib/quotes/surface-labor-system-defaults";
import {
  DEFAULT_COAT_BASIS,
  productivityScopeForJobType,
  type SurfaceProductivityProfile,
} from "@/lib/quotes/surface-productivity";

export {
  getSurfaceLaborSystemDefaultMeta,
  getSystemSurfaceLaborValues,
  SURFACE_LABOR_SYSTEM_DEFAULTS,
  type SurfaceLaborSystemDefaultMeta,
} from "@/lib/quotes/surface-labor-system-defaults";

export type SurfaceLaborTabKey =
  | "walls"
  | "ceilings"
  | "trim"
  | "windows"
  | "doors";

/** @deprecated Legacy coverage overrides are ignored; coverage is per product. */
type LegacySurfaceCoverageOverride = {
  coverageSqFtPerGallon?: number | null;
  coverageLinearFtPerGallon?: number | null;
};

export type SurfaceLaborOverride = LegacySurfaceCoverageOverride & {
  sqFtPerLaborHour?: number | null;
  linearFtPerLaborHour?: number | null;
  hoursPerUnit?: number | null;
  coatBasis?: number | null;
  /** Trim/baseboard face width in inches — converts linear ft to paintable sq ft. */
  profileWidthInches?: number | null;
  /** Door/window unit width in inches for material quantity. */
  unitWidthInches?: number | null;
  /** Door/window unit height in inches for material quantity. */
  unitHeightInches?: number | null;
  /** Painted faces per door/window unit (e.g. 2 for both sides of a door). */
  paintedSides?: number | null;
};

export type CabinetLaborDefaults = {
  hoursPerBox?: number | null;
  hoursPerDoor?: number | null;
  hoursPerDrawer?: number | null;
};

export type CabinetLaborSystemMeta = {
  label: string;
  recommendedDefault: string;
  typicalRange: string;
  notes: string;
};

export const CABINET_LABOR_SYSTEM_META: CabinetLaborSystemMeta = {
  label: "Cabinet painting",
  recommendedDefault:
    "1.5 hrs per box, 1.25 hrs per door, 0.65 hrs per drawer front",
  typicalRange: "1–2 hrs/box · 1–1.5 hrs/door · 0.5–0.75 hrs/drawer front",
  notes:
    "Count each cabinet box, door, and drawer front separately. Labor hours × your average crew rate.",
};

export type ScopedSurfaceLaborDefaults = Partial<
  Record<SurfaceLaborTabKey, SurfaceLaborOverride>
>;

export type CompanySurfaceLaborDefaults = {
  interior: ScopedSurfaceLaborDefaults;
  exterior: ScopedSurfaceLaborDefaults;
  cabinets: CabinetLaborDefaults;
};

export const SURFACE_LABOR_TAB_META: {
  key: SurfaceLaborTabKey;
  label: string;
  description: string;
}[] = [
  {
    key: "walls",
    label: "Walls",
    description: "Production per hour (2-coat basis).",
  },
  {
    key: "ceilings",
    label: "Ceilings",
    description: "Ceiling production per hour.",
  },
  {
    key: "trim",
    label: "Trim",
    description:
      "Linear ft production per hour and profile width for material gallons.",
  },
  {
    key: "windows",
    label: "Windows",
    description: "Hours per window and unit size for material gallons.",
  },
  {
    key: "doors",
    label: "Doors",
    description: "Hours per door and unit size for material gallons.",
  },
];

const BUILTIN_PROFILES = buildSystemSurfaceLaborProfiles();

const IGNORED_SURFACE_LABOR_OVERRIDE_KEYS = new Set([
  "coverageSqFtPerGallon",
  "coverageLinearFtPerGallon",
]);

export function hasSurfaceLaborOverride(
  override?: SurfaceLaborOverride | null,
): boolean {
  if (!override || typeof override !== "object") return false;
  return Object.entries(override).some(
    ([key, value]) =>
      !IGNORED_SURFACE_LABOR_OVERRIDE_KEYS.has(key) &&
      value != null &&
      !Number.isNaN(value),
  );
}

export function mergeSurfaceLaborOverride(
  system: SurfaceLaborOverride,
  override?: SurfaceLaborOverride | null,
): SurfaceLaborOverride {
  return mergeOverride(system, override);
}

export function resolveSurfaceLaborForEditor(
  scope: SurfaceLaborScope,
  tabKey: SurfaceLaborTabKey,
  stored?: SurfaceLaborOverride | null,
): SurfaceLaborOverride {
  return mergeSurfaceLaborOverride(
    getSystemSurfaceLaborValues(scope, tabKey),
    stored,
  );
}

export function resetSurfaceLaborOverride(
  defaults: CompanySurfaceLaborDefaults,
  scope: SurfaceLaborScope,
  key: SurfaceLaborTabKey,
): CompanySurfaceLaborDefaults {
  const scopeDefaults = { ...defaults[scope] };
  delete scopeDefaults[key];
  return { ...defaults, [scope]: scopeDefaults };
}

export const DEFAULT_CABINET_LABOR_DEFAULTS = {
  hoursPerBox: 1.5,
  hoursPerDoor: 1.25,
  hoursPerDrawer: 0.65,
} as const satisfies CabinetLaborDefaults;

export function hasCabinetLaborOverride(
  cabinets?: CabinetLaborDefaults | null,
): boolean {
  if (!cabinets || typeof cabinets !== "object") return false;
  return (
    cabinets.hoursPerBox != null ||
    cabinets.hoursPerDoor != null ||
    cabinets.hoursPerDrawer != null
  );
}

export function resolveCabinetLaborDefaults(
  stored?: CabinetLaborDefaults | null,
): {
  hoursPerBox: number;
  hoursPerDoor: number;
  hoursPerDrawer: number;
} {
  return {
    hoursPerBox:
      stored?.hoursPerBox ?? DEFAULT_CABINET_LABOR_DEFAULTS.hoursPerBox,
    hoursPerDoor:
      stored?.hoursPerDoor ?? DEFAULT_CABINET_LABOR_DEFAULTS.hoursPerDoor,
    hoursPerDrawer:
      stored?.hoursPerDrawer ?? DEFAULT_CABINET_LABOR_DEFAULTS.hoursPerDrawer,
  };
}

function parseCabinetLaborOverrides(raw: unknown): CabinetLaborDefaults {
  if (!raw || typeof raw !== "object") return {};

  const record = raw as Record<string, unknown>;
  const readHours = (key: keyof CabinetLaborDefaults): number | undefined => {
    const value = record[key];
    if (value == null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const cabinets: CabinetLaborDefaults = {};
  const hoursPerBox = readHours("hoursPerBox");
  const hoursPerDoor = readHours("hoursPerDoor");
  const hoursPerDrawer = readHours("hoursPerDrawer");

  if (hoursPerBox != null) cabinets.hoursPerBox = hoursPerBox;
  if (hoursPerDoor != null) cabinets.hoursPerDoor = hoursPerDoor;
  if (hoursPerDrawer != null) cabinets.hoursPerDrawer = hoursPerDrawer;

  return cabinets;
}

export function emptySurfaceLaborDefaults(): CompanySurfaceLaborDefaults {
  return {
    interior: {},
    exterior: {},
    cabinets: {},
  };
}

function surfaceTabForKind(surfaceType: QuoteSurfaceKind): SurfaceLaborTabKey {
  if (surfaceType === "ceiling") return "ceilings";
  if (surfaceType === "trim") return "trim";
  if (surfaceType === "door") return "doors";
  if (surfaceType === "window") return "windows";
  return "walls";
}

function mergeOverride(
  builtin: SurfaceLaborOverride,
  override?: SurfaceLaborOverride | null,
): SurfaceLaborOverride {
  if (!override) return builtin;
  return {
    sqFtPerLaborHour: override.sqFtPerLaborHour ?? builtin.sqFtPerLaborHour,
    linearFtPerLaborHour:
      override.linearFtPerLaborHour ?? builtin.linearFtPerLaborHour,
    hoursPerUnit: override.hoursPerUnit ?? builtin.hoursPerUnit,
    coatBasis: override.coatBasis ?? builtin.coatBasis,
    profileWidthInches:
      override.profileWidthInches ?? builtin.profileWidthInches,
    unitWidthInches: override.unitWidthInches ?? builtin.unitWidthInches,
    unitHeightInches: override.unitHeightInches ?? builtin.unitHeightInches,
    paintedSides: override.paintedSides ?? builtin.paintedSides,
  };
}

export function parseSurfaceLaborDefaults(
  value: unknown,
): CompanySurfaceLaborDefaults {
  const base = emptySurfaceLaborDefaults();
  if (!value || typeof value !== "object") return base;

  const record = value as Record<string, unknown>;
  const readScope = (scope: "interior" | "exterior"): ScopedSurfaceLaborDefaults => {
    const raw = record[scope];
    if (!raw || typeof raw !== "object") return {};
    return raw as ScopedSurfaceLaborDefaults;
  };

  return {
    interior: readScope("interior"),
    exterior: readScope("exterior"),
    cabinets: parseCabinetLaborOverrides(record.cabinets),
  };
}

export function resolveSurfaceLaborOverride(
  surfaceType: QuoteSurfaceKind,
  jobType: QuoteJobType,
  companyDefaults?: CompanySurfaceLaborDefaults | null,
): SurfaceLaborOverride {
  const scope = productivityScopeForJobType(jobType);
  const tab = surfaceTabForKind(surfaceType);
  const builtin = BUILTIN_PROFILES[scope][tab];
  const override = companyDefaults?.[scope]?.[tab];
  return mergeOverride(builtin, override);
}

export function surfaceProfileFromOverride(
  surfaceType: QuoteSurfaceKind,
  jobType: QuoteJobType,
  companyDefaults?: CompanySurfaceLaborDefaults | null,
): SurfaceProductivityProfile {
  const override = resolveSurfaceLaborOverride(
    surfaceType,
    jobType,
    companyDefaults,
  );
  const tab = surfaceTabForKind(surfaceType);
  const label = SURFACE_LABOR_TAB_META.find((entry) => entry.key === tab)?.label;

  return {
    label: label ?? tab,
    coverageSqFtPerGallon: null,
    coverageLinearFtPerGallon: null,
    sqFtPerLaborHour: override.sqFtPerLaborHour ?? null,
    linearFtPerLaborHour: override.linearFtPerLaborHour ?? null,
    hoursPerUnit: override.hoursPerUnit ?? null,
    coatBasis: override.coatBasis ?? DEFAULT_COAT_BASIS,
  };
}
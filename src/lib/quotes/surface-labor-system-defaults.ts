import { DEFAULT_COAT_BASIS } from "@/lib/quotes/surface-productivity";

export type SurfaceLaborScope = "interior" | "exterior";

export type SystemSurfaceLaborTabKey =
  | "walls"
  | "ceilings"
  | "trim"
  | "windows"
  | "doors";

export type SystemSurfaceLaborValues = {
  sqFtPerLaborHour?: number;
  linearFtPerLaborHour?: number;
  hoursPerUnit?: number;
  coatBasis?: number;
  profileWidthInches?: number;
  unitWidthInches?: number;
  unitHeightInches?: number;
  paintedSides?: number;
};

export type SurfaceLaborSystemDefaultMeta = {
  scope: SurfaceLaborScope;
  tabKey: SystemSurfaceLaborTabKey;
  label: string;
  recommendedDefault: string;
  typicalRange: string;
  notes: string;
  values: SystemSurfaceLaborValues;
};

/** Authoritative system-wide production defaults (not stored per company until overridden). */
export const SURFACE_LABOR_SYSTEM_DEFAULTS: SurfaceLaborSystemDefaultMeta[] = [
  {
    scope: "interior",
    tabKey: "walls",
    label: "Interior walls",
    recommendedDefault: "100 sq ft per hour (2 coats)",
    typicalRange: "85 – 125 sq ft/hr",
    notes:
      "Many painters start around 85 sq ft/hr. 100 is common for smooth drywall. Spray can hit 150+.",
    values: {
      sqFtPerLaborHour: 100,
      coatBasis: DEFAULT_COAT_BASIS,
    },
  },
  {
    scope: "interior",
    tabKey: "ceilings",
    label: "Interior ceilings",
    recommendedDefault: "75 sq ft per hour (2 coats)",
    typicalRange: "60 – 100 sq ft/hr",
    notes:
      "Many crews start around 60 sq ft/hr. Overhead work is slower. Flat ceilings are faster than textured.",
    values: {
      sqFtPerLaborHour: 75,
      coatBasis: DEFAULT_COAT_BASIS,
    },
  },
  {
    scope: "interior",
    tabKey: "trim",
    label: "Interior trim",
    recommendedDefault: "25 linear ft per hour (2 coats)",
    typicalRange: "18 – 35 linear ft/hr",
    notes:
      "25 ln ft/hr is a solid starting point. Ornate or tall trim often drops to 15–20.",
    values: {
      linearFtPerLaborHour: 25,
      coatBasis: DEFAULT_COAT_BASIS,
      profileWidthInches: 4,
    },
  },
  {
    scope: "interior",
    tabKey: "windows",
    label: "Interior windows",
    recommendedDefault: "0.5 hours per window",
    typicalRange: "0.4 – 0.8 hours each",
    notes: "Includes frame/sill. More detail = higher time.",
    values: {
      hoursPerUnit: 0.5,
      coatBasis: 1,
      unitWidthInches: 36,
      unitHeightInches: 48,
      paintedSides: 1,
    },
  },
  {
    scope: "interior",
    tabKey: "doors",
    label: "Interior doors",
    recommendedDefault: "1 hour per door (both sides + frame)",
    typicalRange: "0.75 – 1.5 hours each",
    notes: "Typical range is 0.5–1.5 hours per door. Panel doors take longer.",
    values: {
      hoursPerUnit: 1,
      coatBasis: DEFAULT_COAT_BASIS,
      unitWidthInches: 36,
      unitHeightInches: 80,
      paintedSides: 2,
    },
  },
  {
    scope: "exterior",
    tabKey: "walls",
    label: "Exterior walls",
    recommendedDefault: "60 sq ft per hour (2 coats)",
    typicalRange: "45 – 80 sq ft/hr",
    notes: "Siding is slower than interior. Spray can reach 80–100.",
    values: {
      sqFtPerLaborHour: 60,
      coatBasis: DEFAULT_COAT_BASIS,
    },
  },
  {
    scope: "exterior",
    tabKey: "ceilings",
    label: "Exterior ceilings (soffit/fascia)",
    recommendedDefault: "45 sq ft per hour (2 coats)",
    typicalRange: "35 – 60 sq ft/hr",
    notes: "Often overhead + awkward access.",
    values: {
      sqFtPerLaborHour: 45,
      coatBasis: DEFAULT_COAT_BASIS,
    },
  },
  {
    scope: "exterior",
    tabKey: "trim",
    label: "Exterior trim",
    recommendedDefault: "17.5 linear ft per hour (2 coats)",
    typicalRange: "12 – 25 linear ft/hr",
    notes: "More detail and height = slower.",
    values: {
      linearFtPerLaborHour: 17.5,
      coatBasis: DEFAULT_COAT_BASIS,
      profileWidthInches: 4,
    },
  },
  {
    scope: "exterior",
    tabKey: "windows",
    label: "Exterior windows",
    recommendedDefault: "1 hour per window",
    typicalRange: "0.75 – 1.5 hours each",
    notes: "Includes more prep and access.",
    values: {
      hoursPerUnit: 1,
      coatBasis: 1,
      unitWidthInches: 36,
      unitHeightInches: 48,
      paintedSides: 1,
    },
  },
  {
    scope: "exterior",
    tabKey: "doors",
    label: "Exterior doors",
    recommendedDefault: "2 hours per door",
    typicalRange: "1.5 – 3 hours each",
    notes: "Includes frame, weather exposure, and prep.",
    values: {
      hoursPerUnit: 2,
      coatBasis: DEFAULT_COAT_BASIS,
      unitWidthInches: 36,
      unitHeightInches: 80,
      paintedSides: 2,
    },
  },
];

const systemDefaultByKey = new Map(
  SURFACE_LABOR_SYSTEM_DEFAULTS.map((entry) => [
    `${entry.scope}:${entry.tabKey}`,
    entry,
  ]),
);

export function getSurfaceLaborSystemDefaultMeta(
  scope: SurfaceLaborScope,
  tabKey: SystemSurfaceLaborTabKey,
): SurfaceLaborSystemDefaultMeta {
  return (
    systemDefaultByKey.get(`${scope}:${tabKey}`) ??
    SURFACE_LABOR_SYSTEM_DEFAULTS[0]
  );
}

export function getSystemSurfaceLaborValues(
  scope: SurfaceLaborScope,
  tabKey: SystemSurfaceLaborTabKey,
): SystemSurfaceLaborValues {
  return { ...getSurfaceLaborSystemDefaultMeta(scope, tabKey).values };
}

export function buildSystemSurfaceLaborProfiles(): Record<
  SurfaceLaborScope,
  Record<SystemSurfaceLaborTabKey, SystemSurfaceLaborValues>
> {
  const profiles: Record<
    SurfaceLaborScope,
    Record<SystemSurfaceLaborTabKey, SystemSurfaceLaborValues>
  > = {
    interior: {} as Record<SystemSurfaceLaborTabKey, SystemSurfaceLaborValues>,
    exterior: {} as Record<SystemSurfaceLaborTabKey, SystemSurfaceLaborValues>,
  };

  for (const entry of SURFACE_LABOR_SYSTEM_DEFAULTS) {
    profiles[entry.scope][entry.tabKey] = { ...entry.values };
  }

  return profiles;
}
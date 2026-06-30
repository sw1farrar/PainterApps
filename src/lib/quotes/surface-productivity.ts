import { resolveProductCoverageSqFt } from "@/lib/paint-library/coverage";
import type {
  Company,
  QuoteJobType,
  QuoteRateType,
  QuoteSurfaceKind,
} from "@/types/database";
import type { SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import {
  parseSurfaceLaborDefaults,
  surfaceProfileFromOverride,
  type CompanySurfaceLaborDefaults,
} from "@/lib/quotes/surface-labor-defaults";

/** Production rates assume this many coats unless noted (e.g. windows). */
export const DEFAULT_COAT_BASIS = 2;

export type SurfaceProductivityProfile = {
  label: string;
  coverageSqFtPerGallon: number | null;
  coverageLinearFtPerGallon: number | null;
  sqFtPerLaborHour: number | null;
  linearFtPerLaborHour: number | null;
  hoursPerUnit: number | null;
  coatBasis: number;
};

type ProductivityScope = "interior" | "exterior";

const INTERIOR_WALL: SurfaceProductivityProfile = {
  label: "Interior walls",
  coverageSqFtPerGallon: null,
  coverageLinearFtPerGallon: null,
  sqFtPerLaborHour: 100,
  linearFtPerLaborHour: null,
  hoursPerUnit: null,
  coatBasis: DEFAULT_COAT_BASIS,
};

const INTERIOR_CEILING: SurfaceProductivityProfile = {
  label: "Interior ceilings",
  coverageSqFtPerGallon: null,
  coverageLinearFtPerGallon: null,
  sqFtPerLaborHour: 75,
  linearFtPerLaborHour: null,
  hoursPerUnit: null,
  coatBasis: DEFAULT_COAT_BASIS,
};

const INTERIOR_TRIM: SurfaceProductivityProfile = {
  label: "Interior trim",
  coverageSqFtPerGallon: null,
  coverageLinearFtPerGallon: null,
  sqFtPerLaborHour: null,
  linearFtPerLaborHour: 30,
  hoursPerUnit: null,
  coatBasis: 1,
};

const INTERIOR_DOOR: SurfaceProductivityProfile = {
  label: "Interior doors",
  coverageSqFtPerGallon: null,
  coverageLinearFtPerGallon: null,
  sqFtPerLaborHour: null,
  linearFtPerLaborHour: null,
  hoursPerUnit: 1,
  coatBasis: DEFAULT_COAT_BASIS,
};

const INTERIOR_WINDOW: SurfaceProductivityProfile = {
  label: "Interior windows",
  coverageSqFtPerGallon: null,
  coverageLinearFtPerGallon: null,
  sqFtPerLaborHour: null,
  linearFtPerLaborHour: null,
  hoursPerUnit: 0.5,
  coatBasis: 1,
};

const EXTERIOR_SIDING: SurfaceProductivityProfile = {
  label: "Exterior siding",
  coverageSqFtPerGallon: null,
  coverageLinearFtPerGallon: null,
  sqFtPerLaborHour: 60,
  linearFtPerLaborHour: null,
  hoursPerUnit: null,
  coatBasis: DEFAULT_COAT_BASIS,
};

const EXTERIOR_TRIM: SurfaceProductivityProfile = {
  label: "Exterior trim",
  coverageSqFtPerGallon: null,
  coverageLinearFtPerGallon: null,
  sqFtPerLaborHour: null,
  linearFtPerLaborHour: 17.5,
  hoursPerUnit: null,
  coatBasis: 1,
};

const EXTERIOR_DOOR: SurfaceProductivityProfile = {
  label: "Exterior doors",
  coverageSqFtPerGallon: null,
  coverageLinearFtPerGallon: null,
  sqFtPerLaborHour: null,
  linearFtPerLaborHour: null,
  hoursPerUnit: 2,
  coatBasis: DEFAULT_COAT_BASIS,
};

const EXTERIOR_WINDOW: SurfaceProductivityProfile = {
  label: "Exterior windows",
  coverageSqFtPerGallon: null,
  coverageLinearFtPerGallon: null,
  sqFtPerLaborHour: null,
  linearFtPerLaborHour: null,
  hoursPerUnit: 1,
  coatBasis: 1,
};

const INTERIOR_PROFILES: Record<QuoteSurfaceKind, SurfaceProductivityProfile> = {
  wall: INTERIOR_WALL,
  ceiling: INTERIOR_CEILING,
  floor: INTERIOR_WALL,
  closet: INTERIOR_WALL,
  custom: INTERIOR_WALL,
  trim: INTERIOR_TRIM,
  door: INTERIOR_DOOR,
  window: INTERIOR_WINDOW,
};

const EXTERIOR_PROFILES: Record<QuoteSurfaceKind, SurfaceProductivityProfile> = {
  wall: EXTERIOR_SIDING,
  ceiling: EXTERIOR_SIDING,
  floor: EXTERIOR_SIDING,
  closet: EXTERIOR_SIDING,
  custom: EXTERIOR_SIDING,
  trim: EXTERIOR_TRIM,
  door: EXTERIOR_DOOR,
  window: EXTERIOR_WINDOW,
};

export function productivityScopeForJobType(
  jobType: QuoteJobType,
): ProductivityScope {
  return jobType === "exterior" ? "exterior" : "interior";
}

export function resolveSurfaceLaborDefaultsFromCompany(
  company: Pick<Company, "surface_labor_defaults">,
): CompanySurfaceLaborDefaults {
  return parseSurfaceLaborDefaults(company.surface_labor_defaults);
}

export function resolveSurfaceProductivity(
  surfaceType: QuoteSurfaceKind,
  jobType: QuoteJobType = "interior",
  surfaceLaborDefaults?: CompanySurfaceLaborDefaults | null,
): SurfaceProductivityProfile {
  if (surfaceLaborDefaults) {
    return surfaceProfileFromOverride(
      surfaceType,
      jobType,
      surfaceLaborDefaults,
    );
  }

  const scope = productivityScopeForJobType(jobType);
  const table = scope === "exterior" ? EXTERIOR_PROFILES : INTERIOR_PROFILES;
  return table[surfaceType] ?? INTERIOR_WALL;
}

export function getLaborCostPerHour(company: Company): number {
  const avg = company.avg_labor_cost_per_hour;
  if (avg != null && avg > 0) return avg;
  const rates = company.labor_rates as Record<string, number>;
  return rates.painter ?? 45;
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function doorHoursPerUnit(coats: number): number {
  return Math.min(1.5, Math.max(0.5, coats * 0.5));
}

export function estimateSurfaceLaborHours(
  surface: Pick<
    SurfaceInput,
    "surface_type" | "rate_type" | "sq_ft" | "coats"
  >,
  jobType: QuoteJobType = "interior",
  surfaceLaborDefaults?: CompanySurfaceLaborDefaults | null,
): number {
  const coats = Math.max(surface.coats || DEFAULT_COAT_BASIS, 1);
  const qty = surface.sq_ft ?? 0;
  if (qty <= 0 && surface.rate_type !== "each") return 0;

  const profile = resolveSurfaceProductivity(
    surface.surface_type,
    jobType,
    surfaceLaborDefaults,
  );

  if (surface.rate_type === "each") {
    const count = Math.max(qty, 1);
    if (profile.hoursPerUnit != null && profile.hoursPerUnit > 0) {
      const basis = profile.coatBasis || 1;
      return roundHours(count * profile.hoursPerUnit * (coats / basis));
    }
    if (surface.surface_type === "door") {
      return roundHours(count * doorHoursPerUnit(coats));
    }
    if (surface.surface_type === "window") {
      return roundHours(count * 0.5);
    }
    return roundHours(count);
  }

  if (surface.rate_type === "linear") {
    const rate = profile.linearFtPerLaborHour;
    if (!rate || rate <= 0) return 0;
    const basis = profile.coatBasis || 1;
    const adjusted = qty * (coats / basis);
    return roundHours(Math.max(0.25, adjusted / rate));
  }

  const rate = profile.sqFtPerLaborHour;
  if (!rate || rate <= 0) return 0;
  const basis = profile.coatBasis || DEFAULT_COAT_BASIS;
  const adjusted = qty * (coats / basis);
  return roundHours(Math.max(0.25, adjusted / rate));
}

export function resolveSurfaceCoverage(
  _surfaceType: QuoteSurfaceKind,
  _rateType: QuoteRateType,
  _jobType: QuoteJobType,
  _company: Pick<Company, "coverage_sqft_per_gallon"> &
    Partial<Pick<Company, "surface_labor_defaults">>,
  productCoverage?: number | null,
): number {
  return resolveProductCoverageSqFt(
    productCoverage != null
      ? { coverage_sqft_per_gallon: productCoverage }
      : null,
  );
}

export function formatLaborHours(hours: number): string {
  if (hours <= 0) return "0 hr";
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return minutes <= 0 ? "<1 min" : `${minutes} min`;
  }
  if (hours < 10) {
    const text = hours.toFixed(1).replace(/\.0$/, "");
    return `${text} hr`;
  }
  return `${Math.round(hours * 10) / 10} hr`;
}

/** Reference rows for settings / onboarding copy. */
export const SURFACE_PRODUCTIVITY_REFERENCE: {
  scope: ProductivityScope;
  rows: { surface: string; production: string }[];
}[] = [
  {
    scope: "interior",
    rows: [
      {
        surface: "Walls",
        production: "100 sq ft/hr (2 coats)",
      },
      {
        surface: "Ceilings",
        production: "75 sq ft/hr (2 coats)",
      },
      {
        surface: "Trim",
        production: "30 ln ft/hr",
      },
      {
        surface: "Doors",
        production: "0.5–1.5 hr per door",
      },
      {
        surface: "Windows",
        production: "0.5 hr each",
      },
    ],
  },
  {
    scope: "exterior",
    rows: [
      {
        surface: "Siding / walls",
        production: "60 sq ft/hr (2 coats)",
      },
      {
        surface: "Trim / detail",
        production: "17.5 ln ft/hr",
      },
      {
        surface: "Doors",
        production: "~2 hr per door",
      },
      {
        surface: "Windows",
        production: "~1 hr each",
      },
    ],
  },
];
import type { SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import type { AreaSubstrateId } from "@/lib/quotes/area-substrates";
import { getSubstrateProductivityOverride } from "@/lib/quotes/substrate-productivity";
import {
  mergeSurfaceLaborOverride,
  resolveSurfaceLaborOverride,
  type CompanySurfaceLaborDefaults,
  type SurfaceLaborOverride,
} from "@/lib/quotes/surface-labor-defaults";
import {
  estimateSurfaceLaborHours,
  resolveSurfaceLaborDefaultsFromCompany,
} from "@/lib/quotes/surface-productivity";
import { computeSurfaceGallons } from "@/lib/quotes/surface-gallons";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import type { Company, QuoteJobType } from "@/types/database";

const LABOR_HOURS_LINE = /^labor_hours:([\d.]+)$/;
const PREP_HOURS_LINE = /^prep_hours:([\d.]+)$/;
const GALLONS_LINE = /^gallons:([\d.]+)$/;
const PRIMER_PRODUCT_LINE = /^primer_product_id:([a-f0-9-]+)$/i;
const SQFT_PER_HR_LINE = /^sqft_per_hr:([\d.]+)$/;
const LINEAR_FT_PER_HR_LINE = /^linear_ft_per_hr:([\d.]+)$/;
const HOURS_PER_UNIT_LINE = /^hours_per_unit:([\d.]+)$/;
const COAT_BASIS_LINE = /^coat_basis:([\d.]+)$/;

export type SurfaceProductivityOverrides = {
  sqFtPerLaborHour: number | null;
  linearFtPerLaborHour: number | null;
  hoursPerUnit: number | null;
  coatBasis: number | null;
};

export type SurfaceFieldOverrides = SurfaceProductivityOverrides & {
  laborHours: number | null;
  prepHours: number | null;
  gallons: number | null;
  primerProductId: string | null;
};

function readPositiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseSurfaceFieldOverrides(
  notes: string | null | undefined,
): SurfaceFieldOverrides {
  let laborHours: number | null = null;
  let prepHours: number | null = null;
  let gallons: number | null = null;
  let primerProductId: string | null = null;
  let sqFtPerLaborHour: number | null = null;
  let linearFtPerLaborHour: number | null = null;
  let hoursPerUnit: number | null = null;
  let coatBasis: number | null = null;

  for (const line of notes?.split("\n") ?? []) {
    const trimmed = line.trim();
    const laborMatch = trimmed.match(LABOR_HOURS_LINE);
    if (laborMatch) {
      laborHours = Number(laborMatch[1]) || null;
      continue;
    }
    const prepMatch = trimmed.match(PREP_HOURS_LINE);
    if (prepMatch) {
      prepHours = Number(prepMatch[1]) || null;
      continue;
    }
    const gallonsMatch = trimmed.match(GALLONS_LINE);
    if (gallonsMatch) {
      gallons = Number(gallonsMatch[1]) || null;
      continue;
    }
    const primerMatch = trimmed.match(PRIMER_PRODUCT_LINE);
    if (primerMatch) {
      primerProductId = primerMatch[1] || null;
      continue;
    }
    const sqftMatch = trimmed.match(SQFT_PER_HR_LINE);
    if (sqftMatch) {
      sqFtPerLaborHour = readPositiveNumber(sqftMatch[1]);
      continue;
    }
    const linearMatch = trimmed.match(LINEAR_FT_PER_HR_LINE);
    if (linearMatch) {
      linearFtPerLaborHour = readPositiveNumber(linearMatch[1]);
      continue;
    }
    const hoursMatch = trimmed.match(HOURS_PER_UNIT_LINE);
    if (hoursMatch) {
      hoursPerUnit = readPositiveNumber(hoursMatch[1]);
      continue;
    }
    const coatMatch = trimmed.match(COAT_BASIS_LINE);
    if (coatMatch) {
      coatBasis = readPositiveNumber(coatMatch[1]);
    }
  }

  return {
    laborHours,
    prepHours,
    gallons,
    primerProductId,
    sqFtPerLaborHour,
    linearFtPerLaborHour,
    hoursPerUnit,
    coatBasis,
  };
}

export function surfaceProductivityOverridesFromNotes(
  notes: string | null | undefined,
): SurfaceLaborOverride | null {
  const parsed = parseSurfaceFieldOverrides(notes);
  const override: SurfaceLaborOverride = {};
  if (parsed.sqFtPerLaborHour != null) {
    override.sqFtPerLaborHour = parsed.sqFtPerLaborHour;
  }
  if (parsed.linearFtPerLaborHour != null) {
    override.linearFtPerLaborHour = parsed.linearFtPerLaborHour;
  }
  if (parsed.hoursPerUnit != null) {
    override.hoursPerUnit = parsed.hoursPerUnit;
  }
  return Object.keys(override).length > 0 ? override : null;
}

export function resolvePrimerProductIdForSurface(
  surface: Pick<SurfaceInput, "notes">,
): string | null {
  return parseSurfaceFieldOverrides(surface.notes).primerProductId;
}

export function mergeSurfaceOverrideNotes(
  notes: string | null | undefined,
  patch: Partial<SurfaceFieldOverrides>,
): string | null {
  const lines = (notes?.split("\n") ?? []).filter((line) => {
    const trimmed = line.trim();
    if (patch.laborHours !== undefined && LABOR_HOURS_LINE.test(trimmed)) {
      return false;
    }
    if (patch.prepHours !== undefined && PREP_HOURS_LINE.test(trimmed)) {
      return false;
    }
    if (patch.gallons !== undefined && GALLONS_LINE.test(trimmed)) {
      return false;
    }
    if (patch.primerProductId !== undefined && PRIMER_PRODUCT_LINE.test(trimmed)) {
      return false;
    }
    if (patch.sqFtPerLaborHour !== undefined && SQFT_PER_HR_LINE.test(trimmed)) {
      return false;
    }
    if (
      patch.linearFtPerLaborHour !== undefined &&
      LINEAR_FT_PER_HR_LINE.test(trimmed)
    ) {
      return false;
    }
    if (patch.hoursPerUnit !== undefined && HOURS_PER_UNIT_LINE.test(trimmed)) {
      return false;
    }
    if (patch.coatBasis !== undefined && COAT_BASIS_LINE.test(trimmed)) {
      return false;
    }
    return trimmed.length > 0;
  });

  if (patch.laborHours != null && patch.laborHours > 0) {
    lines.push(`labor_hours:${patch.laborHours}`);
  }
  if (patch.prepHours != null && patch.prepHours > 0) {
    lines.push(`prep_hours:${patch.prepHours}`);
  }
  if (patch.gallons != null && patch.gallons > 0) {
    lines.push(`gallons:${patch.gallons}`);
  }
  if (patch.primerProductId) {
    lines.push(`primer_product_id:${patch.primerProductId}`);
  }
  if (patch.sqFtPerLaborHour != null && patch.sqFtPerLaborHour > 0) {
    lines.push(`sqft_per_hr:${patch.sqFtPerLaborHour}`);
  }
  if (patch.linearFtPerLaborHour != null && patch.linearFtPerLaborHour > 0) {
    lines.push(`linear_ft_per_hr:${patch.linearFtPerLaborHour}`);
  }
  if (patch.hoursPerUnit != null && patch.hoursPerUnit > 0) {
    lines.push(`hours_per_unit:${patch.hoursPerUnit}`);
  }
  if (patch.coatBasis != null && patch.coatBasis > 0) {
    lines.push(`coat_basis:${patch.coatBasis}`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

export function clearLaborHoursOverride(
  notes: string | null | undefined,
): string | null {
  return mergeSurfaceOverrideNotes(notes, { laborHours: null });
}

/** Drop manual labor and gallon overrides so coats/dimensions can recalculate. */
export function clearDerivedSurfaceEstimates(
  notes: string | null | undefined,
): string | null {
  return mergeSurfaceOverrideNotes(notes, {
    laborHours: null,
    gallons: null,
  });
}

export function shouldRecalculateDerivedEstimates(
  patch: Partial<{
    coats?: number;
    sq_ft?: number;
  }>,
): boolean {
  return patch.coats !== undefined || patch.sq_ft !== undefined;
}

export function resolveEffectiveSurfaceLaborOverride(
  surface: Pick<
    SurfaceInput,
    "surface_type" | "rate_type" | "notes"
  >,
  jobType: QuoteJobType,
  options?: {
    surfaceLaborDefaults?: CompanySurfaceLaborDefaults | null;
    prepWork?: string | null;
    substrateId?: AreaSubstrateId | null;
  },
): SurfaceLaborOverride {
  const companyOverride = resolveSurfaceLaborOverride(
    surface.surface_type,
    jobType,
    options?.surfaceLaborDefaults,
  );
  const substrateOverride = options?.substrateId
    ? getSubstrateProductivityOverride(options.prepWork, options.substrateId)
    : null;
  const surfaceOverride = surfaceProductivityOverridesFromNotes(surface.notes);

  return mergeSurfaceLaborOverride(
    mergeSurfaceLaborOverride(companyOverride, substrateOverride),
    surfaceOverride,
  );
}

export function resolveLaborHoursForSurface(
  surface: Pick<
    SurfaceInput,
    "surface_type" | "rate_type" | "sq_ft" | "coats" | "notes"
  >,
  jobType: QuoteJobType = "interior",
  surfaceLaborDefaults?: CompanySurfaceLaborDefaults | null,
  options?: {
    prepWork?: string | null;
    substrateId?: AreaSubstrateId | null;
  },
): number {
  const override = parseSurfaceFieldOverrides(surface.notes).laborHours;
  if (override != null && override >= 0) {
    return Math.round(override * 100) / 100;
  }
  const productivityOverride = resolveEffectiveSurfaceLaborOverride(
    surface,
    jobType,
    {
      surfaceLaborDefaults,
      prepWork: options?.prepWork,
      substrateId: options?.substrateId,
    },
  );
  return estimateSurfaceLaborHours(
    surface,
    jobType,
    surfaceLaborDefaults,
    productivityOverride,
  );
}

export function resolvePrepHoursForSurface(
  surface: Pick<SurfaceInput, "notes">,
): number {
  const override = parseSurfaceFieldOverrides(surface.notes).prepHours;
  if (override != null && override >= 0) {
    return Math.round(override * 100) / 100;
  }
  return 0;
}

export function resolveGallonsForSurface(
  surface: Pick<
    SurfaceInput,
    "surface_type" | "rate_type" | "sq_ft" | "coats" | "notes"
  >,
  product: Pick<
    CompanyPaintProductRow,
    "unit_cost" | "coverage_sqft_per_gallon"
  > | null,
  company: Pick<
    Company,
    "coverage_sqft_per_gallon" | "material_waste_pct" | "surface_labor_defaults"
  >,
  jobType: QuoteJobType = "interior",
): number {
  const override = parseSurfaceFieldOverrides(surface.notes).gallons;
  if (override != null && override >= 0) {
    return Math.round(override * 100) / 100;
  }
  return computeSurfaceGallons(
    surface.sq_ft,
    surface.coats,
    surface.rate_type ?? "sqft",
    product,
    company,
    { surfaceType: surface.surface_type, jobType },
  );
}

export function resolveSurfaceLaborDefaults(
  company: Company,
): CompanySurfaceLaborDefaults {
  return resolveSurfaceLaborDefaultsFromCompany(company);
}
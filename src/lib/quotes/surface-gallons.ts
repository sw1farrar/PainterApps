import { resolveProductCoverageSqFt } from "@/lib/paint-library/coverage";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import { computePaintableSqFt } from "@/lib/quotes/paintable-sqft";
import { resolveSurfaceLaborOverride } from "@/lib/quotes/surface-labor-defaults";
import {
  resolveSurfaceCoverage,
  resolveSurfaceLaborDefaultsFromCompany,
} from "@/lib/quotes/surface-productivity";
import type {
  Company,
  QuoteJobType,
  QuoteRateType,
  QuoteSurfaceKind,
} from "@/types/database";

const PAINTABLE_RATE_TYPES = new Set<QuoteRateType>(["sqft", "linear"]);

export function productCoverageSqFt(
  product: Pick<CompanyPaintProductRow, "coverage_sqft_per_gallon"> | null,
  _company?: Pick<Company, "coverage_sqft_per_gallon">,
): number {
  return resolveProductCoverageSqFt(product);
}

/** Decimal gallons with waste factor (not rounded up to whole gallons). */
export function estimateDecimalGallons(
  sqFt: number,
  coats: number,
  coverage: number,
  wastePct = 10,
): number {
  if (!coverage || sqFt <= 0 || coats <= 0) return 0;
  const base = (sqFt * coats) / coverage;
  const withWaste = wastePct > 0 ? base * (1 + wastePct / 100) : base;
  return Math.round(withWaste * 100) / 100;
}

export function formatGallons(value: number): string {
  if (value <= 0) return "0";
  if (value < 10) return value.toFixed(2).replace(/\.?0+$/, "");
  return value.toFixed(1).replace(/\.0$/, "");
}

export function surfaceSupportsGallons(rateType: string): boolean {
  return PAINTABLE_RATE_TYPES.has(rateType as QuoteRateType);
}

export type ComputeSurfaceGallonsOptions = {
  surfaceType?: QuoteSurfaceKind;
  jobType?: QuoteJobType;
  /** When set, linear/each surfaces use profile dimensions for paintable sq ft. */
  paintableSqFt?: number;
};

export function computeSurfaceGallons(
  sqFt: number,
  coats: number,
  rateType: string,
  product: Pick<CompanyPaintProductRow, "coverage_sqft_per_gallon"> | null,
  company: Pick<
    Company,
    "coverage_sqft_per_gallon" | "material_waste_pct" | "surface_labor_defaults"
  >,
  options?: ComputeSurfaceGallonsOptions,
): number {
  const surfaceType = options?.surfaceType ?? "wall";
  const jobType = options?.jobType ?? "interior";
  const typedRate = rateType as QuoteRateType;

  let paintableSqFt = options?.paintableSqFt ?? sqFt;
  if (
    options?.paintableSqFt == null &&
    (typedRate === "linear" || typedRate === "each")
  ) {
    const laborDefaults = company.surface_labor_defaults
      ? resolveSurfaceLaborDefaultsFromCompany(
          company as Pick<Company, "surface_labor_defaults">,
        )
      : null;
    const profile = resolveSurfaceLaborOverride(
      surfaceType,
      jobType,
      laborDefaults,
    );
    paintableSqFt = computePaintableSqFt(
      { surface_type: surfaceType, rate_type: typedRate, sq_ft: sqFt },
      profile,
    );
  }

  const supportsGallons =
    surfaceSupportsGallons(typedRate) ||
    (typedRate === "each" && paintableSqFt > 0);
  if (!supportsGallons || paintableSqFt <= 0) return 0;

  const productCoverage = product?.coverage_sqft_per_gallon ?? null;
  const coverage = resolveSurfaceCoverage(
    surfaceType,
    typedRate === "linear" && paintableSqFt !== sqFt ? "sqft" : typedRate,
    jobType,
    company,
    productCoverage,
  );
  return estimateDecimalGallons(paintableSqFt, coats, coverage, 0);
}

export function productGallonsPerLaborHour(
  product: Pick<CompanyPaintProductRow, "gallons_per_labor_hour"> | null,
  company: Pick<Company, "gallons_per_labor_hour">,
): number {
  if (product?.gallons_per_labor_hour && product.gallons_per_labor_hour > 0) {
    return product.gallons_per_labor_hour;
  }
  return company.gallons_per_labor_hour || 4;
}

export function paintingHoursForGallons(
  gallons: number,
  product: Pick<CompanyPaintProductRow, "gallons_per_labor_hour"> | null,
  company: Pick<Company, "gallons_per_labor_hour">,
): number {
  const gph = productGallonsPerLaborHour(product, company);
  if (gph <= 0 || gallons <= 0) return 0;
  return Math.round((gallons / gph) * 100) / 100;
}
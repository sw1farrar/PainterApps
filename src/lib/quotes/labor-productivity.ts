import { DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON } from "@/lib/paint-library/coverage";
import type { Company } from "@/types/database";

const LEGACY_SQ_FT_PER_LABOR_HOUR = 175;

export function getGallonsPerLaborHour(company: Pick<Company, "gallons_per_labor_hour">): number {
  const value = company.gallons_per_labor_hour;
  if (value != null && value > 0) return value;
  return 4;
}

export function getSqFtPerLaborHour(
  company: Pick<Company, "gallons_per_labor_hour" | "coverage_sqft_per_gallon">,
): number {
  const gph = getGallonsPerLaborHour(company);
  const coverage = DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON;
  const derived = gph * coverage;
  return derived > 0 ? derived : LEGACY_SQ_FT_PER_LABOR_HOUR;
}

export function estimatePaintingLaborHours(
  primerGallons: number,
  topcoatGallons: number,
  company: Pick<Company, "gallons_per_labor_hour">,
): number {
  const totalGallons = primerGallons + topcoatGallons;
  if (totalGallons <= 0) return 0;
  const gph = getGallonsPerLaborHour(company);
  return Math.max(1, Math.ceil(totalGallons / gph));
}

export function sqFtBasedLaborHours(
  sqFt: number,
  coats: number,
  company: Pick<Company, "gallons_per_labor_hour" | "coverage_sqft_per_gallon">,
): number {
  if (sqFt <= 0 || coats <= 0) return 0;
  const sqFtPerHour = getSqFtPerLaborHour(company);
  return Math.max(1, Math.ceil((sqFt * coats) / sqFtPerHour));
}
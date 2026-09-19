/**
 * CoverCalc — theoretical coverage with porosity, coats, and waste.
 *
 * Default theoretical spread for architectural latex: 350 sq ft / gallon
 * on a sealed, non-porous surface at the recommended film thickness.
 * Porosity, extra coats, and job-site waste all increase gallons.
 */

export const THEORETICAL_SQFT_PER_GALLON = 350;
export const LITRES_PER_GALLON = 3.785411784;
export const SQFT_PER_SQM = 10.7639104167;

export type AreaUnit = "sqft" | "sqm";
export type Porosity = "sealed" | "normal" | "porous" | "raw-masonry";

export const POROSITY_MULTIPLIER: Record<Porosity, number> = {
  sealed: 1,
  normal: 1.1,
  porous: 1.25,
  "raw-masonry": 1.45,
};

export type CoverageInput = {
  area: number;
  unit: AreaUnit;
  porosity: Porosity;
  coats: number;
  wastePercent: number;
  sqftPerGallon?: number;
};

export type CoverageResult = {
  areaSqft: number;
  gallons: number;
  litres: number;
  gallonsRounded: number;
  litresRounded: number;
  effectiveSqftPerGallon: number;
};

export function toSqft(area: number, unit: AreaUnit): number {
  return unit === "sqm" ? area * SQFT_PER_SQM : area;
}

export function calculateCoverage(input: CoverageInput): CoverageResult {
  const areaSqft = Math.max(0, toSqft(input.area, input.unit));
  const coats = Math.max(1, input.coats);
  const waste = Math.max(0, input.wastePercent) / 100;
  const theoretical = input.sqftPerGallon ?? THEORETICAL_SQFT_PER_GALLON;
  const porosity = POROSITY_MULTIPLIER[input.porosity] ?? 1.1;
  const effectiveSqftPerGallon = theoretical / porosity;
  const rawGallons = (areaSqft * coats) / effectiveSqftPerGallon;
  const gallons = rawGallons * (1 + waste);
  const litres = gallons * LITRES_PER_GALLON;

  return {
    areaSqft,
    gallons,
    litres,
    gallonsRounded: Math.ceil(gallons * 10) / 10,
    litresRounded: Math.ceil(litres * 10) / 10,
    effectiveSqftPerGallon,
  };
}

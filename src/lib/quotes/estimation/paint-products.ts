import { resolveProductCoverageSqFt } from "@/lib/paint-library/coverage";
import type { Company } from "@/types/database";
import type {
  CompanyPaintProductRow,
  ResolvedTierPaintConfig,
  TierPaintConfigInput,
} from "@/lib/paint-library/types";
import { effectivePrimerCoats } from "@/lib/quotes/primer-coverage";
import { estimateGallons } from "@/lib/quotes/pricing";
import {
  estimatePaintingLaborHours,
  getGallonsPerLaborHour,
} from "@/lib/quotes/labor-productivity";
import type { TaggedLineItem } from "./types";

export type MaterialGallonBreakdown = {
  primerGallons: number;
  topcoatGallons: number;
  totalGallons: number;
  primerMaterialCost: number;
  topcoatMaterialCost: number;
  totalMaterialCost: number;
  paintingLaborHours: number;
  paintingLaborCost: number;
};

function productCoverage(product: CompanyPaintProductRow | null): number {
  return resolveProductCoverageSqFt(product);
}

function applyWaste(gallons: number, _company: Company): number {
  return gallons;
}

export function estimateProductGallons(
  sqFt: number,
  coats: number,
  coverage: number,
  company: Company,
): number {
  const base = estimateGallons(sqFt, coats, coverage);
  return applyWaste(base, company);
}

export function computeMaterialBreakdown(
  paintableSqFt: number,
  config: ResolvedTierPaintConfig,
  company: Company,
  materialMarkup: number,
): MaterialGallonBreakdown {
  const laborRates = company.labor_rates as Record<string, number>;
  const painterRate = laborRates.painter ?? 45;

  let primerGallons = 0;
  let topcoatGallons = 0;
  let primerMaterialCost = 0;
  let topcoatMaterialCost = 0;

  if (config.topcoat && paintableSqFt > 0) {
    const coverage = productCoverage(config.topcoat);
    topcoatGallons = estimateProductGallons(
      paintableSqFt,
      config.topcoat_coats,
      coverage,
      company,
    );
    const cost = topcoatGallons * config.topcoat.unit_cost;
    topcoatMaterialCost = cost * (1 + materialMarkup / 100);
  }

  if (config.primer && !config.topcoat?.is_self_priming && paintableSqFt > 0) {
    const coverage = productCoverage(config.primer);
    primerGallons = estimateProductGallons(
      paintableSqFt,
      effectivePrimerCoats(config, company.spot_prime_material_pct),
      coverage,
      company,
    );
    const cost = primerGallons * config.primer.unit_cost;
    primerMaterialCost = cost * (1 + materialMarkup / 100);
  }

  const totalGallons = primerGallons + topcoatGallons;
  const paintingLaborHours = estimatePaintingLaborHours(
    primerGallons,
    topcoatGallons,
    company,
  );
  const paintingLaborCost = paintingLaborHours * painterRate;

  return {
    primerGallons,
    topcoatGallons,
    totalGallons,
    primerMaterialCost,
    topcoatMaterialCost,
    totalMaterialCost: primerMaterialCost + topcoatMaterialCost,
    paintingLaborHours,
    paintingLaborCost,
  };
}

export function buildPaintMaterialLineItems(
  paintableSqFt: number,
  config: ResolvedTierPaintConfig,
  company: Company,
  materialMarkup: number,
  roomRef = "Project",
): TaggedLineItem[] {
  if (paintableSqFt <= 0) return [];

  const items: TaggedLineItem[] = [];
  const breakdown = computeMaterialBreakdown(
    paintableSqFt,
    config,
    company,
    materialMarkup,
  );

  if (config.primer && breakdown.primerGallons > 0) {
    items.push({
      type: "material",
      description: `${roomRef} — ${config.primer.name} (primer${config.primer_spot_prime ? ", spot prime" : ""})`,
      qty: breakdown.primerGallons,
      unit_cost: config.primer.unit_cost,
      markup: materialMarkup,
      source: "surface",
      company_paint_product_id: config.primer.id,
      paint_role: "primer",
      room_id: null,
      is_optional: false,
      sort_order: 0,
    });
  }

  if (config.topcoat && breakdown.topcoatGallons > 0) {
    items.push({
      type: "material",
      description: `${roomRef} — ${config.topcoat.name} (topcoat)`,
      qty: breakdown.topcoatGallons,
      unit_cost: config.topcoat.unit_cost,
      markup: materialMarkup,
      source: "surface",
      company_paint_product_id: config.topcoat.id,
      paint_role: "topcoat",
      room_id: null,
      is_optional: false,
      sort_order: 1,
    });
  }

  return items;
}

export type TierDeltaResult = {
  materialDelta: number;
  laborDelta: number;
  laborHoursDelta: number;
  addedFeatures: string[];
};

export function computeTierDeltas(
  good: MaterialGallonBreakdown,
  alternate: MaterialGallonBreakdown,
  goodConfig: TierPaintConfigInput,
  alternateConfig: TierPaintConfigInput,
  company: Company,
): TierDeltaResult {
  const laborRates = company.labor_rates as Record<string, number>;
  const painterRate = laborRates.painter ?? 45;

  const materialDelta = alternate.totalMaterialCost - good.totalMaterialCost;

  const autoLaborHoursDelta =
    alternate.paintingLaborHours - good.paintingLaborHours;
  const explicitHours =
    alternateConfig.labor_hours_delta_hours -
    goodConfig.labor_hours_delta_hours;
  const pctBase = good.paintingLaborHours;
  const pctDelta =
    (pctBase * (alternateConfig.labor_hours_delta_pct - goodConfig.labor_hours_delta_pct)) /
    100;

  const laborHoursDelta = autoLaborHoursDelta + explicitHours + pctDelta;
  const laborDelta = laborHoursDelta * painterRate;

  const goodFeatures = new Set(goodConfig.value_add_features);
  const addedFeatures = alternateConfig.value_add_features.filter(
    (f) => !goodFeatures.has(f),
  );

  return {
    materialDelta,
    laborDelta,
    laborHoursDelta,
    addedFeatures,
  };
}

export function collectTierFeatures(
  config: ResolvedTierPaintConfig,
): string[] {
  const fromProducts = [
    ...(config.primer?.paint_system_features ?? []),
    ...(config.topcoat?.paint_system_features ?? []),
  ];
  const merged = [...fromProducts, ...config.value_add_features];
  return [...new Set(merged.filter(Boolean))];
}

export function formatGallonsHoursPreview(
  breakdown: MaterialGallonBreakdown,
  company: Company,
): string {
  const gph = getGallonsPerLaborHour(company);
  const parts: string[] = [];
  if (breakdown.primerGallons > 0) {
    parts.push(`${breakdown.primerGallons} gal primer`);
  }
  if (breakdown.topcoatGallons > 0) {
    parts.push(`${breakdown.topcoatGallons} gal topcoat`);
  }
  if (parts.length === 0) return "Select products to estimate";
  return `${parts.join(" + ")} = ${breakdown.totalGallons} gal → ${breakdown.paintingLaborHours} hrs @ ${gph} gal/hr`;
}
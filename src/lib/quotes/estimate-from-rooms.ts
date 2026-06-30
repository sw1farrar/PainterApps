import { estimateGallons } from "@/lib/quotes/pricing";
import type { ResolvedTierPaintConfig } from "@/lib/paint-library/types";
import {
  estimatePaintingLaborHours,
  sqFtBasedLaborHours,
} from "@/lib/quotes/labor-productivity";
import { effectivePrimerCoats } from "@/lib/quotes/primer-coverage";
import {
  buildPaintMaterialLineItems,
  estimateProductGallons,
} from "@/lib/quotes/estimation/paint-products";
import { getEstimatePricingDefaults } from "@/lib/quotes/estimate-pricing-defaults";
import {
  DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
  resolveProductCoverageSqFt,
} from "@/lib/paint-library/coverage";
import type { Company, CompanyPaintProductRole } from "@/types/database";

export type RoomEstimateInput = {
  name: string;
  sq_ft: number;
  coats: number;
  condition: string;
  prep_work?: string | null;
};

const BASE_PAINT_COST_PER_GALLON = 45;

function prepHoursForCondition(condition: string): number {
  if (condition === "poor") return 4;
  if (condition === "fair") return 2;
  if (condition === "good") return 1;
  return 0;
}

function productCoverage(
  product: { coverage_sqft_per_gallon: number | null } | null,
): number {
  return resolveProductCoverageSqFt(product);
}

function roomPaintingLaborHours(
  room: RoomEstimateInput,
  company: Company,
  goodTierPaint?: ResolvedTierPaintConfig | null,
): number {
  if (goodTierPaint?.topcoat && room.sq_ft > 0) {
    let primerGallons = 0;
    if (goodTierPaint.primer && !goodTierPaint.topcoat.is_self_priming) {
      primerGallons = estimateProductGallons(
        room.sq_ft,
        effectivePrimerCoats(goodTierPaint, company.spot_prime_material_pct),
        productCoverage(goodTierPaint.primer),
        company,
      );
    }
    const topcoatGallons = estimateProductGallons(
      room.sq_ft,
      goodTierPaint.topcoat_coats,
      productCoverage(goodTierPaint.topcoat),
      company,
    );
    return estimatePaintingLaborHours(primerGallons, topcoatGallons, company);
  }
  return sqFtBasedLaborHours(room.sq_ft, room.coats, company);
}

export function buildLineItemsFromRooms(
  rooms: RoomEstimateInput[],
  company: Company,
  goodTierPaint?: ResolvedTierPaintConfig | null,
) {
  const laborRates = company.labor_rates as Record<string, number>;
  const painterRate = laborRates.painter ?? 45;
  const prepRate = laborRates.prep ?? 40;
  const { materialMarkupPct } = getEstimatePricingDefaults(company);
  const coverage = DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON;

  const items: Array<{
    type: "labor" | "material" | "extra";
    description: string;
    qty: number;
    unit_cost: number;
    markup: number;
    company_paint_product_id?: string | null;
    paint_role?: CompanyPaintProductRole | null;
  }> = [];

  for (const room of rooms) {
    if (!room.name.trim() || room.sq_ft <= 0) continue;

    const laborHours = roomPaintingLaborHours(room, company, goodTierPaint);

    items.push({
      type: "labor",
      description: `${room.name} — painting (${room.coats} coats)`,
      qty: laborHours,
      unit_cost: painterRate,
      markup: 0,
    });

    if (goodTierPaint?.topcoat) {
      const materialItems = buildPaintMaterialLineItems(
        room.sq_ft,
        goodTierPaint,
        company,
        materialMarkupPct,
        room.name,
      );
      for (const mat of materialItems) {
        items.push({
          type: "material",
          description: mat.description,
          qty: mat.qty,
          unit_cost: mat.unit_cost,
          markup: mat.markup,
          company_paint_product_id: mat.company_paint_product_id ?? undefined,
          paint_role: mat.paint_role ?? undefined,
        });
      }
    } else {
      const gallons = estimateGallons(room.sq_ft, room.coats, coverage);
      if (gallons > 0) {
        items.push({
          type: "material",
          description: `${room.name} — paint & supplies`,
          qty: gallons,
          unit_cost: BASE_PAINT_COST_PER_GALLON,
          markup: materialMarkupPct,
        });
      }
    }

    const prepHours =
      prepHoursForCondition(room.condition) || (room.prep_work?.trim() ? 2 : 0);
    if (prepHours > 0) {
      items.push({
        type: "labor",
        description: `${room.name} — prep work`,
        qty: prepHours,
        unit_cost: prepRate,
        markup: 0,
      });
    }
  }

  return items;
}

export function getCompanyPricingSummary(company: Company) {
  const laborRates = company.labor_rates as Record<string, number>;
  const pricing = getEstimatePricingDefaults(company);
  return {
    painterRate: laborRates.painter ?? 45,
    prepRate: laborRates.prep ?? 40,
    laborCostPerHour: company.avg_labor_cost_per_hour ?? laborRates.painter ?? 45,
    laborMarkupPct: pricing.laborMarkupPct,
    overheadPct: company.overhead_pct ?? 0,
    coverage: DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
    gallonsPerLaborHour: company.gallons_per_labor_hour ?? 4,
    taxRate: company.tax_rate ?? 0,
  };
}
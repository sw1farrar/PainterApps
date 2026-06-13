import { estimateGallons } from "@/lib/quotes/pricing";
import type { Company } from "@/types/database";

export type RoomEstimateInput = {
  name: string;
  sq_ft: number;
  coats: number;
  condition: string;
  prep_work?: string | null;
};

const SQ_FT_PER_LABOR_HOUR = 175;
const BASE_PAINT_COST_PER_GALLON = 45;

function prepHoursForCondition(condition: string): number {
  if (condition === "poor") return 4;
  if (condition === "fair") return 2;
  if (condition === "good") return 1;
  return 0;
}

export function buildLineItemsFromRooms(
  rooms: RoomEstimateInput[],
  company: Company,
) {
  const laborRates = company.labor_rates as Record<string, number>;
  const painterRate = laborRates.painter ?? 45;
  const prepRate = laborRates.prep ?? 40;
  const materialMarkup = company.material_markup ?? 20;
  const coverage = company.coverage_sqft_per_gallon || 350;

  const items: Array<{
    type: "labor" | "material" | "extra";
    description: string;
    qty: number;
    unit_cost: number;
    markup: number;
  }> = [];

  for (const room of rooms) {
    if (!room.name.trim() || room.sq_ft <= 0) continue;

    const gallons = estimateGallons(room.sq_ft, room.coats, coverage);
    const laborHours = Math.max(
      1,
      Math.ceil((room.sq_ft * room.coats) / SQ_FT_PER_LABOR_HOUR),
    );

    items.push({
      type: "labor",
      description: `${room.name} — painting (${room.coats} coats)`,
      qty: laborHours,
      unit_cost: painterRate,
      markup: 0,
    });

    if (gallons > 0) {
      items.push({
        type: "material",
        description: `${room.name} — paint & supplies`,
        qty: gallons,
        unit_cost: BASE_PAINT_COST_PER_GALLON,
        markup: materialMarkup,
      });
    }

    const prepHours =
      prepHoursForCondition(room.condition) || (room.prep_work?.trim() ? 2 : 0);

    if (prepHours > 0) {
      items.push({
        type: "labor",
        description: `${room.name} — surface prep`,
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

  return {
    painterRate: laborRates.painter ?? 45,
    prepRate: laborRates.prep ?? 40,
    materialMarkup: company.material_markup ?? 20,
    overheadPct: company.overhead_pct ?? 0,
    taxRate: company.tax_rate ?? 0,
    coverage: company.coverage_sqft_per_gallon || 350,
  };
}
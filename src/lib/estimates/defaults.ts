import type { CoatRates, RateUnit } from "./time-based";

export const DEFAULT_HOURLY_RATE = 65;

export const DEFAULT_RATES: Array<{
  category: string;
  name: string;
  unit: RateUnit;
  coats: CoatRates;
  materialSpreadSqftGal?: number;
  materialCostPerGal?: number;
  sort: number;
}> = [
  {
    category: "Interior",
    name: "Walls, 8 ft",
    unit: "sqft_per_hr",
    coats: { 1: 125, 2: 85, 3: 70 },
    materialSpreadSqftGal: 350,
    materialCostPerGal: 42,
    sort: 10,
  },
  {
    category: "Interior",
    name: "Ceilings",
    unit: "sqft_per_hr",
    coats: { 1: 90, 2: 60, 3: 50 },
    materialSpreadSqftGal: 350,
    materialCostPerGal: 38,
    sort: 20,
  },
  {
    category: "Interior",
    name: "Baseboards",
    unit: "lnft_per_hr",
    coats: { 1: 40, 2: 25, 3: 20 },
    sort: 30,
  },
  {
    category: "Interior",
    name: "Windows",
    unit: "hr_per_item",
    coats: { 1: 0.35, 2: 0.5, 3: 0.65 },
    sort: 40,
  },
  {
    category: "Interior",
    name: "Doors (one side + frame)",
    unit: "hr_per_item",
    coats: { 1: 1, 2: 1.5, 3: 2 },
    sort: 50,
  },
  {
    category: "Exterior",
    name: "Siding",
    unit: "sqft_per_hr",
    coats: { 1: 100, 2: 70, 3: 55 },
    materialSpreadSqftGal: 350,
    materialCostPerGal: 48,
    sort: 60,
  },
  {
    category: "Exterior",
    name: "Trim",
    unit: "lnft_per_hr",
    coats: { 1: 30, 2: 20, 3: 15 },
    sort: 70,
  },
];

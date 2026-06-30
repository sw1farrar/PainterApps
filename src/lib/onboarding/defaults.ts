import type { QuoteTierName } from "@/types/database";

export const ONBOARDING_DEFAULTS = {
  laborRates: {
    painter: 45,
    prep: 40,
    supervisor: 55,
  },
  defaultGrossMarginPct: 25,
  defaultMargins: {
    good: 25,
    better: 30,
    best: 35,
    beautiful: 40,
  },
  tierMultipliers: {
    good: 1,
    better: 1.15,
    best: 1.3,
    beautiful: 1.5,
  } satisfies Record<QuoteTierName, number>,
  taxRate: 0,
  materialMarkup: 15,
  laborMarkupPct: 25,
  sundriesPct: 20,
  overheadPct: 15,
  coverageSqftPerGallon: 350,
  gallonsPerLaborHour: 4,
  avgLaborCostPerHour: 45,
  materialWastePct: 10,
  spotPrimeMaterialPct: 10,
  perGallonPremium: 25,
  premiumServiceFee: 150,
};
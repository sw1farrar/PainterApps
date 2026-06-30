import {
  emptyTierPaintConfig,
  QUOTE_PAINT_TIERS,
  type TierPaintConfigInput,
} from "@/lib/paint-library/types";
import { ONBOARDING_DEFAULTS } from "@/lib/onboarding/defaults";
import {
  BASELINE_SURFACE_CATEGORIES,
  baselineScopesForJobType,
  emptyBaselinePaintSystems,
  goodTierPaintFromBaselineForScope,
  isBaselineConfigured,
  normalizeBaselinePaintSystems,
  primaryBaselineScope,
  type BaselineApplicationScope,
  type BaselinePaintSystemInput,
} from "@/lib/quotes/baseline-paint";
import {
  emptySurfaceLaborDefaults,
  parseSurfaceLaborDefaults,
  type CompanySurfaceLaborDefaults,
} from "@/lib/quotes/surface-labor-defaults";
import type {
  Company,
  QuoteJobType,
  QuoteTierName,
  QuoteUpgradeRules,
} from "@/types/database";

export const ESTIMATE_DEFAULT_SCOPES: BaselineApplicationScope[] = [
  "interior",
  "exterior",
];

export type CompanyEstimateDefaults = {
  taxRate: number;
  materialMarkup: number;
  laborMarkupPct: number;
  sundriesPct: number;
  overheadPct: number;
  surfaceLaborDefaults: CompanySurfaceLaborDefaults;
  coverageSqftPerGallon: number;
  gallonsPerLaborHour: number;
  materialWastePct: number;
  spotPrimeMaterialPct: number;
  avgLaborCostPerHour: number | null;
  laborRates: Record<string, number>;
  defaultGrossMarginPct: number;
  perGallonPremium: number;
  premiumServiceFee: number;
  tierMultipliers: Record<QuoteTierName, number>;
  baselineSystems: BaselinePaintSystemInput[];
  tierDefaultsByScope: Record<
    BaselineApplicationScope,
    Record<string, TierPaintConfigInput>
  >;
};

export type CompanyEstimateDefaultsInput = Omit<
  CompanyEstimateDefaults,
  "tierDefaultsByScope"
> & {
  tierDefaultsByScope: Record<BaselineApplicationScope, TierPaintConfigInput[]>;
};

function emptyTierDefaultsRecord(): Record<string, TierPaintConfigInput> {
  return {
    good: emptyTierPaintConfig("good"),
    better: emptyTierPaintConfig("better"),
    best: emptyTierPaintConfig("best"),
  };
}

export function emptyTierDefaultsByScope(): Record<
  BaselineApplicationScope,
  Record<string, TierPaintConfigInput>
> {
  return {
    interior: emptyTierDefaultsRecord(),
    exterior: emptyTierDefaultsRecord(),
  };
}

export function tierDefaultsListForScope(
  byScope: Record<BaselineApplicationScope, Record<string, TierPaintConfigInput>>,
  scope: BaselineApplicationScope,
): TierPaintConfigInput[] {
  return QUOTE_PAINT_TIERS.map((tier) => byScope[scope][tier]);
}

/** Stored gross margin from DB only — never substitutes system defaults. */
export function readStoredGrossMarginPct(
  margins: Record<string, number> | null | undefined,
): number {
  if (!margins || typeof margins !== "object") return 0;
  const good = margins.good;
  return typeof good === "number" && Number.isFinite(good) ? good : 0;
}

/** Resolved margin for estimates when company has not configured one yet. */
export function readDefaultGrossMarginPct(
  margins: Record<string, number> | null | undefined,
): number {
  if (
    margins &&
    typeof margins === "object" &&
    typeof margins.good === "number" &&
    Number.isFinite(margins.good)
  ) {
    return margins.good;
  }
  return ONBOARDING_DEFAULTS.defaultGrossMarginPct;
}

const STORED_TIER_MULTIPLIERS: Record<QuoteTierName, number> = {
  good: 1,
  better: 1,
  best: 1,
  beautiful: 1,
};

function buildTierDefaultsByScope(
  tierDefaultRows: TierPaintConfigInput[],
): Record<BaselineApplicationScope, Record<string, TierPaintConfigInput>> {
  const tierDefaultsByScope = emptyTierDefaultsByScope();
  for (const scope of ESTIMATE_DEFAULT_SCOPES) {
    const scoped = tierDefaultRows.filter((row) => {
      const rowScope = (row as TierPaintConfigInput & { application_scope?: string })
        .application_scope;
      if (rowScope) return rowScope === scope;
      return scope === "interior";
    });
    tierDefaultsByScope[scope] = normalizeTierDefaultsByScope(scoped, scope);
  }
  return tierDefaultsByScope;
}

export function defaultMarginsFromGrossMarginPct(
  pct: number,
): Record<string, number> {
  return {
    good: pct,
    better: pct,
    best: pct,
    beautiful: pct,
  };
}

export function syncGoodTierDefaultsFromBaseline(
  baselineSystems: BaselinePaintSystemInput[],
  tierDefaultsByScope: CompanyEstimateDefaults["tierDefaultsByScope"],
): CompanyEstimateDefaults["tierDefaultsByScope"] {
  const next = structuredClone(tierDefaultsByScope);

  for (const scope of ESTIMATE_DEFAULT_SCOPES) {
    const wallPatch = goodTierPaintFromBaselineForScope(baselineSystems, scope);
    next[scope].good = {
      ...next[scope].good,
      ...wallPatch,
      tier: "good",
      labor_hours_delta_pct: 0,
      labor_hours_delta_hours: 0,
      prep_hours_delta: 0,
    };
  }

  return next;
}

export function companyEstimateDefaultsToInput(
  state: CompanyEstimateDefaults,
): CompanyEstimateDefaultsInput {
  const tierDefaultsByScope = syncGoodTierDefaultsFromBaseline(
    state.baselineSystems,
    state.tierDefaultsByScope,
  );

  return {
    ...state,
    tierDefaultsByScope: {
      interior: tierDefaultsListForScope(tierDefaultsByScope, "interior"),
      exterior: tierDefaultsListForScope(tierDefaultsByScope, "exterior"),
    },
  };
}

/** Stable snapshot for dirty-checking in the estimate defaults modal. */
export function serializeCompanyEstimateDefaultsForCompare(
  state: CompanyEstimateDefaults,
): string {
  return JSON.stringify(companyEstimateDefaultsToInput(state));
}

export function normalizeTierDefaultsByScope(
  rows: TierPaintConfigInput[],
  scope: BaselineApplicationScope,
): Record<string, TierPaintConfigInput> {
  const base = emptyTierDefaultsRecord();
  for (const row of rows) {
    if (!QUOTE_PAINT_TIERS.includes(row.tier)) continue;
    base[row.tier] = { ...base[row.tier], ...row, tier: row.tier };
  }
  return base;
}

/** Loads exactly what the company saved — for the estimate defaults editor only. */
export function buildStoredCompanyEstimateDefaults(
  company: Company,
  upgradeRules: QuoteUpgradeRules | null,
  baselineRows: BaselinePaintSystemInput[],
  tierDefaultRows: TierPaintConfigInput[],
): CompanyEstimateDefaults {
  return {
    taxRate: company.tax_rate ?? 0,
    materialMarkup: company.material_markup ?? 0,
    laborMarkupPct: company.labor_markup_pct ?? 0,
    sundriesPct: company.sundries_pct ?? 0,
    overheadPct: company.overhead_pct ?? 0,
    surfaceLaborDefaults: parseSurfaceLaborDefaults(
      company.surface_labor_defaults,
    ),
    coverageSqftPerGallon: company.coverage_sqft_per_gallon ?? 0,
    gallonsPerLaborHour: company.gallons_per_labor_hour ?? 0,
    materialWastePct: company.material_waste_pct ?? 0,
    spotPrimeMaterialPct:
      company.spot_prime_material_pct ?? ONBOARDING_DEFAULTS.spotPrimeMaterialPct,
    avgLaborCostPerHour: company.avg_labor_cost_per_hour ?? null,
    laborRates: (company.labor_rates as Record<string, number>) ?? {},
    defaultGrossMarginPct: readStoredGrossMarginPct(
      company.default_margins as Record<string, number> | null,
    ),
    perGallonPremium: upgradeRules?.per_gallon_premium ?? 0,
    premiumServiceFee: upgradeRules?.premium_service_fee ?? 0,
    tierMultipliers:
      (upgradeRules?.tier_multipliers as Record<QuoteTierName, number>) ??
      STORED_TIER_MULTIPLIERS,
    baselineSystems: normalizeBaselinePaintSystems(baselineRows, "both"),
    tierDefaultsByScope: buildTierDefaultsByScope(tierDefaultRows),
  };
}

export function buildCompanyEstimateDefaults(
  company: Company,
  upgradeRules: QuoteUpgradeRules | null,
  baselineRows: BaselinePaintSystemInput[],
  tierDefaultRows: TierPaintConfigInput[],
): CompanyEstimateDefaults {
  const tierDefaultsByScope = buildTierDefaultsByScope(tierDefaultRows);

  return {
    taxRate: company.tax_rate ?? 0,
    materialMarkup: company.material_markup ?? ONBOARDING_DEFAULTS.materialMarkup,
    laborMarkupPct:
      company.labor_markup_pct ?? ONBOARDING_DEFAULTS.laborMarkupPct,
    sundriesPct: company.sundries_pct ?? ONBOARDING_DEFAULTS.sundriesPct,
    overheadPct: company.overhead_pct ?? ONBOARDING_DEFAULTS.overheadPct,
    surfaceLaborDefaults: parseSurfaceLaborDefaults(
      company.surface_labor_defaults,
    ),
    coverageSqftPerGallon:
      company.coverage_sqft_per_gallon ?? ONBOARDING_DEFAULTS.coverageSqftPerGallon,
    gallonsPerLaborHour:
      company.gallons_per_labor_hour ?? ONBOARDING_DEFAULTS.gallonsPerLaborHour,
    materialWastePct: company.material_waste_pct ?? ONBOARDING_DEFAULTS.materialWastePct,
    spotPrimeMaterialPct:
      company.spot_prime_material_pct ?? ONBOARDING_DEFAULTS.spotPrimeMaterialPct,
    avgLaborCostPerHour: company.avg_labor_cost_per_hour ?? null,
    laborRates: (company.labor_rates as Record<string, number>) ?? ONBOARDING_DEFAULTS.laborRates,
    defaultGrossMarginPct: readDefaultGrossMarginPct(
      company.default_margins as Record<string, number> | null,
    ),
    perGallonPremium:
      upgradeRules?.per_gallon_premium ?? ONBOARDING_DEFAULTS.perGallonPremium,
    premiumServiceFee:
      upgradeRules?.premium_service_fee ?? ONBOARDING_DEFAULTS.premiumServiceFee,
    tierMultipliers:
      (upgradeRules?.tier_multipliers as Record<QuoteTierName, number>) ??
      ONBOARDING_DEFAULTS.tierMultipliers,
    baselineSystems: normalizeBaselinePaintSystems(baselineRows, "both"),
    tierDefaultsByScope,
  };
}

export type LoadCompanyEstimateDefaultsOptions = {
  /** When true, returns stored DB values only (no system default substitution). */
  forEditing?: boolean;
};

export function baselineScopeForJobType(
  jobType: QuoteJobType,
): BaselineApplicationScope {
  return primaryBaselineScope(jobType);
}

export function tierDefaultsForJobType(
  defaults: CompanyEstimateDefaults,
  jobType: QuoteJobType,
): TierPaintConfigInput[] {
  const scope = baselineScopeForJobType(jobType);
  return tierDefaultsListForScope(defaults.tierDefaultsByScope, scope);
}

export function baselineSystemsForJobType(
  defaults: CompanyEstimateDefaults,
  jobType: QuoteJobType,
): BaselinePaintSystemInput[] {
  return normalizeBaselinePaintSystems(defaults.baselineSystems, jobType);
}

function interiorFallbackSystems(
  defaults: CompanyEstimateDefaults,
): BaselinePaintSystemInput[] {
  const interiorSystems = baselineSystemsForJobType(defaults, "interior");
  if (isBaselineConfigured(interiorSystems, "interior")) {
    return interiorSystems.filter((row) => row.application_scope === "interior");
  }

  const good = defaults.tierDefaultsByScope.interior.good;
  if (!good.topcoat_product_id) return [];

  return BASELINE_SURFACE_CATEGORIES.map(({ key: surface_category }) => ({
    application_scope: "interior" as const,
    surface_category,
    primer_product_id:
      surface_category === "wall" ? good.primer_product_id : null,
    topcoat_product_id:
      surface_category === "wall" ? good.topcoat_product_id : null,
    primer_coats: good.primer_coats,
    topcoat_coats: good.topcoat_coats,
    primer_spot_prime: good.primer_spot_prime ?? false,
  }));
}

function inheritInteriorBaselineForEmptyScopes(
  systems: BaselinePaintSystemInput[],
  defaults: CompanyEstimateDefaults,
  jobType: QuoteJobType,
): BaselinePaintSystemInput[] {
  const scopes = baselineScopesForJobType(jobType);
  const needsFallback = scopes.some((scope) => {
    const wall = systems.find(
      (row) =>
        row.application_scope === scope && row.surface_category === "wall",
    );
    return !wall?.topcoat_product_id;
  });
  if (!needsFallback) return systems;

  const interiorFallback = interiorFallbackSystems(defaults);
  if (!interiorFallback.length) return systems;

  const interiorByCategory = new Map(
    interiorFallback.map((row) => [row.surface_category, row]),
  );

  return systems.map((row) => {
    if (!scopes.includes(row.application_scope)) return row;
    if (row.topcoat_product_id) return row;

    const interior = interiorByCategory.get(row.surface_category);
    if (!interior?.topcoat_product_id) return row;

    return {
      ...row,
      primer_product_id: row.primer_product_id ?? interior.primer_product_id,
      topcoat_product_id: interior.topcoat_product_id,
      primer_coats: row.primer_coats || interior.primer_coats,
      topcoat_coats: row.topcoat_coats || interior.topcoat_coats,
      primer_spot_prime: row.primer_spot_prime ?? interior.primer_spot_prime,
    };
  });
}

/** Company defaults for a quote job, with interior→scope fallback when a scope is unset. */
export function baselineSystemsForQuoteJob(
  defaults: CompanyEstimateDefaults,
  jobType: QuoteJobType,
): BaselinePaintSystemInput[] {
  const systems = baselineSystemsForJobType(defaults, jobType);
  return inheritInteriorBaselineForEmptyScopes(systems, defaults, jobType);
}

export function collectEstimateDefaultsProductIds(
  defaults: CompanyEstimateDefaults,
): string[] {
  const ids = new Set<string>();

  for (const row of defaults.baselineSystems) {
    if (row.primer_product_id) ids.add(row.primer_product_id);
    if (row.topcoat_product_id) ids.add(row.topcoat_product_id);
  }

  for (const scope of ESTIMATE_DEFAULT_SCOPES) {
    for (const tier of QUOTE_PAINT_TIERS) {
      const row = defaults.tierDefaultsByScope[scope][tier];
      if (row.primer_product_id) ids.add(row.primer_product_id);
      if (row.topcoat_product_id) ids.add(row.topcoat_product_id);
    }
  }

  return [...ids];
}

export function emptyCompanyEstimateDefaults(): CompanyEstimateDefaults {
  const tierDefaultsByScope = emptyTierDefaultsByScope();
  return {
    taxRate: ONBOARDING_DEFAULTS.taxRate,
    materialMarkup: ONBOARDING_DEFAULTS.materialMarkup,
    laborMarkupPct: ONBOARDING_DEFAULTS.laborMarkupPct,
    sundriesPct: ONBOARDING_DEFAULTS.sundriesPct,
    overheadPct: ONBOARDING_DEFAULTS.overheadPct,
    surfaceLaborDefaults: emptySurfaceLaborDefaults(),
    coverageSqftPerGallon: ONBOARDING_DEFAULTS.coverageSqftPerGallon,
    gallonsPerLaborHour: ONBOARDING_DEFAULTS.gallonsPerLaborHour,
    materialWastePct: ONBOARDING_DEFAULTS.materialWastePct,
    spotPrimeMaterialPct: ONBOARDING_DEFAULTS.spotPrimeMaterialPct,
    avgLaborCostPerHour: ONBOARDING_DEFAULTS.avgLaborCostPerHour,
    laborRates: ONBOARDING_DEFAULTS.laborRates,
    defaultGrossMarginPct: ONBOARDING_DEFAULTS.defaultGrossMarginPct,
    perGallonPremium: ONBOARDING_DEFAULTS.perGallonPremium,
    premiumServiceFee: ONBOARDING_DEFAULTS.premiumServiceFee,
    tierMultipliers: ONBOARDING_DEFAULTS.tierMultipliers,
    baselineSystems: emptyBaselinePaintSystems("both"),
    tierDefaultsByScope,
  };
}
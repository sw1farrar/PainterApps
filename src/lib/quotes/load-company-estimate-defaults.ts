import { createClient } from "@/lib/supabase/server";
import {
  QUOTE_PAINT_TIERS,
  type TierPaintConfigInput,
} from "@/lib/paint-library/types";
import {
  buildCompanyEstimateDefaults,
  buildStoredCompanyEstimateDefaults,
  type CompanyEstimateDefaults,
  type LoadCompanyEstimateDefaultsOptions,
} from "@/lib/quotes/company-estimate-defaults";
import {
  emptyBaselinePaintSystems,
  normalizeBaselinePaintSystems,
  type BaselinePaintSystemInput,
} from "@/lib/quotes/baseline-paint";
import type { Company, QuoteUpgradeRules } from "@/types/database";

function parseFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapBaselineRow(row: {
  application_scope: string;
  surface_category: string;
  primer_product_id: string | null;
  topcoat_product_id: string | null;
  primer_coats: number | null;
  topcoat_coats: number | null;
  primer_spot_prime?: boolean | null;
}): BaselinePaintSystemInput {
  return {
    application_scope: row.application_scope as BaselinePaintSystemInput["application_scope"],
    surface_category: row.surface_category as BaselinePaintSystemInput["surface_category"],
    primer_product_id: row.primer_product_id,
    topcoat_product_id: row.topcoat_product_id,
    primer_coats: row.primer_coats ?? 1,
    topcoat_coats: row.topcoat_coats ?? 2,
    primer_spot_prime: row.primer_spot_prime ?? false,
  };
}

function mapTierDefaultRow(row: {
  tier: string;
  application_scope?: string | null;
  primer_product_id: string | null;
  topcoat_product_id: string | null;
  primer_coats: number | null;
  topcoat_coats: number | null;
  labor_hours_delta_pct: number | null;
  labor_hours_delta_hours: number | null;
  prep_hours_delta: number | null;
  value_add_features: unknown;
}): TierPaintConfigInput & { application_scope: string } {
  return {
    tier: row.tier as TierPaintConfigInput["tier"],
    application_scope: row.application_scope ?? "interior",
    primer_product_id: row.primer_product_id,
    topcoat_product_id: row.topcoat_product_id,
    primer_coats: Number(row.primer_coats ?? 1),
    topcoat_coats: Number(row.topcoat_coats ?? 2),
    primer_spot_prime: false,
    labor_hours_delta_pct: Number(row.labor_hours_delta_pct ?? 0),
    labor_hours_delta_hours: Number(row.labor_hours_delta_hours ?? 0),
    prep_hours_delta: Number(row.prep_hours_delta ?? 0),
    value_add_features: parseFeatures(row.value_add_features),
  };
}

export async function loadCompanyEstimateDefaults(
  company: Company,
  options?: LoadCompanyEstimateDefaultsOptions,
): Promise<CompanyEstimateDefaults> {
  const supabase = await createClient();

  const { data: freshCompany, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", company.id)
    .single();

  if (companyError || !freshCompany) {
    throw new Error(companyError?.message ?? "Company not found");
  }

  const companyRow = freshCompany as Company;

  const [
    { data: upgradeRules },
    { data: baselineRows },
    { data: tierRows },
  ] = await Promise.all([
    supabase
      .from("quote_upgrade_rules")
      .select("*")
      .eq("company_id", companyRow.id)
      .maybeSingle(),
    supabase
      .from("company_baseline_paint_systems")
      .select("*")
      .eq("company_id", companyRow.id),
    supabase
      .from("company_tier_defaults")
      .select("*")
      .eq("company_id", companyRow.id),
  ]);

  const baselineSystems = normalizeBaselinePaintSystems(
    (baselineRows ?? []).map(mapBaselineRow),
    "both",
  );

  const tierDefaults: (TierPaintConfigInput & { application_scope: string })[] =
    (tierRows ?? []).map(mapTierDefaultRow);

  if (!tierDefaults.length) {
    for (const tier of QUOTE_PAINT_TIERS) {
      tierDefaults.push({
        tier,
        application_scope: "interior",
        primer_product_id: null,
        topcoat_product_id: null,
        primer_coats: 1,
        topcoat_coats: 2,
        primer_spot_prime: false,
        labor_hours_delta_pct: 0,
        labor_hours_delta_hours: 0,
        prep_hours_delta: 0,
        value_add_features: [],
      });
    }
  }

  const build =
    options?.forEditing === true
      ? buildStoredCompanyEstimateDefaults
      : buildCompanyEstimateDefaults;

  const baselineInput = baselineRows?.length
    ? baselineSystems
    : emptyBaselinePaintSystems("both");

  return build(
    companyRow,
    (upgradeRules as QuoteUpgradeRules | null) ?? null,
    baselineInput,
    tierDefaults,
  );
}
"use server";

import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { QUOTE_PAINT_TIERS } from "@/lib/paint-library/types";
import type { TierPaintConfigInput } from "@/lib/paint-library/types";
import {
  ESTIMATE_DEFAULT_SCOPES,
  defaultMarginsFromGrossMarginPct,
  type CompanyEstimateDefaultsInput,
} from "@/lib/quotes/company-estimate-defaults";
import { loadCompanyEstimateDefaults } from "@/lib/quotes/load-company-estimate-defaults";
import type { BaselinePaintSystemInput } from "@/lib/quotes/baseline-paint";
import type { QuoteTierName } from "@/types/database";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function fetchCompanyEstimateDefaults(): Promise<
  ActionResult<Awaited<ReturnType<typeof loadCompanyEstimateDefaults>>>
> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const data = await loadCompanyEstimateDefaults(company, { forEditing: true });
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load estimate defaults",
    };
  }
}

export async function saveCompanyEstimateDefaults(
  input: CompanyEstimateDefaultsInput,
): Promise<ActionResult> {
  try {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  if (session.profile.role !== "admin") {
    return { success: false, error: "Only admins can update estimate defaults." };
  }
  if (!session.company?.id) {
    return { success: false, error: "Company not found" };
  }

  const companyId = session.company.id;
  const supabase = await createClient();

  const { error: companyError } = await supabase
    .from("companies")
    .update({
      tax_rate: input.taxRate,
      material_markup: 0,
      labor_markup_pct: input.laborMarkupPct,
      sundries_pct: 0,
      overhead_pct: input.overheadPct,
      surface_labor_defaults: input.surfaceLaborDefaults,
      gallons_per_labor_hour: input.gallonsPerLaborHour,
      material_waste_pct: 0,
      avg_labor_cost_per_hour: input.avgLaborCostPerHour ?? null,
      spot_prime_material_pct: input.spotPrimeMaterialPct,
      labor_rates: input.laborRates,
      default_margins: defaultMarginsFromGrossMarginPct(
        input.defaultGrossMarginPct,
      ),
    })
    .eq("id", companyId);

  if (companyError) return { success: false, error: companyError.message };

  const { data: existingRules } = await supabase
    .from("quote_upgrade_rules")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  const rulesPayload = {
    company_id: companyId,
    per_gallon_premium: 0,
    premium_service_fee: 0,
    tier_multipliers: input.tierMultipliers,
  };

  const { error: rulesError } = existingRules?.id
    ? await supabase
        .from("quote_upgrade_rules")
        .update(rulesPayload)
        .eq("id", existingRules.id)
    : await supabase.from("quote_upgrade_rules").insert(rulesPayload);

  if (rulesError) return { success: false, error: rulesError.message };

  for (const system of input.baselineSystems) {
    const payload = {
      company_id: companyId,
      application_scope: system.application_scope,
      surface_category: system.surface_category,
      primer_product_id: system.primer_product_id,
      topcoat_product_id: system.topcoat_product_id,
      primer_coats: system.primer_coats,
      topcoat_coats: system.topcoat_coats,
      primer_spot_prime: false,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("company_baseline_paint_systems")
      .upsert(payload, {
        onConflict: "company_id,application_scope,surface_category",
      });
    if (error) return { success: false, error: error.message };
  }

  for (const scope of ESTIMATE_DEFAULT_SCOPES) {
    const configs = input.tierDefaultsByScope[scope] ?? [];
    for (const config of configs) {
      if (!QUOTE_PAINT_TIERS.includes(config.tier)) continue;
      const payload = {
        company_id: companyId,
        tier: config.tier as QuoteTierName,
        application_scope: scope,
        primer_product_id: config.primer_product_id,
        topcoat_product_id: config.topcoat_product_id,
        primer_coats: config.primer_coats,
        topcoat_coats: config.topcoat_coats,
        labor_hours_delta_pct: config.labor_hours_delta_pct,
        labor_hours_delta_hours: config.labor_hours_delta_hours,
        prep_hours_delta: config.prep_hours_delta,
        value_add_features: config.value_add_features,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("company_tier_defaults")
        .upsert(payload, { onConflict: "company_id,tier,application_scope" });
      if (error) return { success: false, error: error.message };
    }
  }

  revalidatePath("/app/quotes");
  revalidatePath("/app/settings");
  return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to save estimate defaults",
    };
  }
}

export async function fetchCompanyBaselineSystems(): Promise<
  ActionResult<BaselinePaintSystemInput[]>
> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const defaults = await loadCompanyEstimateDefaults(company);
    return { success: true, data: defaults.baselineSystems };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load baseline systems",
    };
  }
}

export async function fetchScopedTierDefaults(
  scope: "interior" | "exterior",
): Promise<ActionResult<TierPaintConfigInput[]>> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const defaults = await loadCompanyEstimateDefaults(company);
    const rows = QUOTE_PAINT_TIERS.map(
      (tier) => defaults.tierDefaultsByScope[scope][tier],
    );
    return { success: true, data: rows };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load tier defaults",
    };
  }
}
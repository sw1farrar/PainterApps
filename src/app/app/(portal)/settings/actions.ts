"use server";

import { revalidatePath } from "next/cache";

import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { normalizePhoneForStorage } from "@/lib/phone";
import { normalizeLogoUrl } from "@/lib/utils";
import type { QuoteTierName } from "@/types/database";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function updateCompanySettings(data: {
  name: string;
  logoUrl?: string;
  address?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
}): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  if (session.profile.role !== "admin") {
    return { success: false, error: "Only admins can update company settings." };
  }

  if (!session.company?.id) {
    return { success: false, error: "No company is linked to this account." };
  }

  if (!data.name.trim()) {
    return { success: false, error: "Company name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: data.name.trim(),
      logo_url: normalizeLogoUrl(data.logoUrl),
      address: data.address?.trim() || null,
      address_line2: data.address_line2?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      zip: data.zip?.trim() || null,
      phone: normalizePhoneForStorage(data.phone),
      email: data.email?.trim() || null,
    })
    .eq("id", session.company.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
  return { success: true };
}

export async function updatePricingSettings(data: {
  taxRate: number;
  materialMarkup: number;
  laborMarkupPct: number;
  sundriesPct: number;
  overheadPct: number;
  coverageSqftPerGallon: number;
  gallonsPerLaborHour: number;
  materialWastePct?: number;
  avgLaborCostPerHour?: number | null;
  laborRates: Record<string, number>;
}): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  if (session.profile.role !== "admin") {
    return { success: false, error: "Only admins can update pricing." };
  }

  if (!session.company?.id) {
    return { success: false, error: "No company is linked to this account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      tax_rate: data.taxRate,
      material_markup: data.materialMarkup,
      labor_markup_pct: data.laborMarkupPct,
      sundries_pct: data.sundriesPct,
      overhead_pct: data.overheadPct,
      coverage_sqft_per_gallon: data.coverageSqftPerGallon,
      gallons_per_labor_hour: data.gallonsPerLaborHour,
      material_waste_pct: data.materialWastePct ?? 10,
      avg_labor_cost_per_hour: data.avgLaborCostPerHour ?? null,
      labor_rates: data.laborRates,
    })
    .eq("id", session.company.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/settings");
  return { success: true };
}

export async function updateUpgradeSettings(data: {
  perGallonPremium: number;
  premiumServiceFee: number;
  tierMultipliers: Record<QuoteTierName, number>;
}): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  if (session.profile.role !== "admin") {
    return { success: false, error: "Only admins can update upgrade rules." };
  }

  if (!session.company?.id) {
    return { success: false, error: "No company is linked to this account." };
  }

  const supabase = await createClient();
  const companyId = session.company.id;

  const { data: existing } = await supabase
    .from("quote_upgrade_rules")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  const payload = {
    company_id: companyId,
    per_gallon_premium: data.perGallonPremium,
    premium_service_fee: data.premiumServiceFee,
    tier_multipliers: data.tierMultipliers,
  };

  const { error } = existing?.id
    ? await supabase
        .from("quote_upgrade_rules")
        .update(payload)
        .eq("id", existing.id)
    : await supabase.from("quote_upgrade_rules").insert(payload);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/settings");
  return { success: true };
}
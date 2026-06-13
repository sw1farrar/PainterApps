"use server";

import { revalidatePath } from "next/cache";

import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { normalizeLogoUrl } from "@/lib/utils";
import type { QuoteTierName } from "@/types/database";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function updateCompanySettings(data: {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
}): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  if (session.profile.role !== "admin") {
    return { success: false, error: "Only admins can update company settings." };
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
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
    })
    .eq("id", session.company!.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
  return { success: true };
}

export async function updatePricingSettings(data: {
  taxRate: number;
  materialMarkup: number;
  overheadPct: number;
  coverageSqftPerGallon: number;
  laborRates: Record<string, number>;
}): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  if (session.profile.role !== "admin") {
    return { success: false, error: "Only admins can update pricing." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      tax_rate: data.taxRate,
      material_markup: data.materialMarkup,
      overhead_pct: data.overheadPct,
      coverage_sqft_per_gallon: data.coverageSqftPerGallon,
      labor_rates: data.laborRates,
    })
    .eq("id", session.company!.id);

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

  const supabase = await createClient();
  const companyId = session.company!.id;

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
"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { normalizeLogoUrl } from "@/lib/utils";
import type { QuoteTierName } from "@/types/database";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function saveCompanyInfo(data: {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
}): Promise<ActionResult<{ companyId: string }>> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireSession();
  const supabase = await createClient();

  if (!data.name.trim()) {
    return { success: false, error: "Company name is required." };
  }

  const companyPayload = {
    name: data.name.trim(),
    slug: slugify(data.name),
    logo_url: normalizeLogoUrl(data.logoUrl),
    address: data.address?.trim() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    onboarding_complete: false,
  };

  let companyId = session.company?.id;

  if (companyId) {
    const { error } = await supabase
      .from("companies")
      .update(companyPayload)
      .eq("id", companyId);

    if (error) return { success: false, error: error.message };
  } else {
    companyId = randomUUID();
    const { error } = await supabase.from("companies").insert({
      id: companyId,
      ...companyPayload,
    });

    if (error) return { success: false, error: error.message };

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ company_id: companyId })
      .eq("id", session.profile.id);

    if (profileError) return { success: false, error: profileError.message };
  }

  revalidatePath("/app/onboarding");
  return { success: true, data: { companyId } };
}

export async function savePricingDefaults(data: {
  taxRate: number;
  materialMarkup: number;
  overheadPct: number;
  coverageSqftPerGallon: number;
  laborRates: Record<string, number>;
  defaultMargins: Record<string, number>;
}): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireSession();
  if (!session.company?.id) {
    return { success: false, error: "Complete company info first." };
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
      default_margins: data.defaultMargins,
    })
    .eq("id", session.company.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/onboarding");
  return { success: true };
}

export async function saveUpgradeRules(data: {
  perGallonPremium: number;
  premiumServiceFee: number;
  tierMultipliers: Record<QuoteTierName, number>;
}): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireSession();
  if (!session.company?.id) {
    return { success: false, error: "Complete company info first." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("quote_upgrade_rules")
    .select("id")
    .eq("company_id", session.company.id)
    .maybeSingle();

  const payload = {
    company_id: session.company.id,
    per_gallon_premium: data.perGallonPremium,
    premium_service_fee: data.premiumServiceFee,
    tier_multipliers: data.tierMultipliers,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("quote_upgrade_rules")
      .update(payload)
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("quote_upgrade_rules").insert(payload);
    if (error) return { success: false, error: error.message };
  }

  const { error: companyError } = await supabase
    .from("companies")
    .update({ onboarding_complete: true })
    .eq("id", session.company.id);

  if (companyError) return { success: false, error: companyError.message };

  revalidatePath("/app");
  redirect("/app/dashboard");
}
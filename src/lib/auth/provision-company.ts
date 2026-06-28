import { randomUUID } from "crypto";

import { DEFAULT_COMPANY_FEATURES } from "@/lib/auth/company-features";
import { uniqueCompanySlug } from "@/lib/sell-sheet/persist";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhoneForStorage } from "@/lib/phone";

export type SignupCompanyMetadata = {
  companyName?: string;
  phone?: string;
  fullName?: string;
};

export function readSignupCompanyMetadata(
  metadata: Record<string, unknown> | undefined,
): SignupCompanyMetadata {
  return {
    companyName:
      typeof metadata?.company_name === "string"
        ? metadata.company_name.trim()
        : undefined,
    phone:
      typeof metadata?.phone === "string" ? metadata.phone.trim() : undefined,
    fullName:
      typeof metadata?.full_name === "string"
        ? metadata.full_name.trim()
        : undefined,
  };
}

/** Creates or updates the user's company from signup metadata after email verification. */
export async function provisionCompanyFromSignupMetadata(
  userId: string,
  email: string,
  metadata: Record<string, unknown> | undefined,
): Promise<{ companyId: string } | { error: string }> {
  const { companyName, phone, fullName } = readSignupCompanyMetadata(metadata);

  if (!companyName) {
    return { error: "Company name is missing from signup." };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("company_id, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (fullName && profile && !profile.full_name?.trim()) {
    await admin
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", userId);
  }

  const companyPayload = {
    name: companyName,
    slug: await uniqueCompanySlug(companyName),
    email: email.trim(),
    phone: normalizePhoneForStorage(phone ?? ""),
    onboarding_complete: false,
    enabled_features: DEFAULT_COMPANY_FEATURES,
  };

  if (profile?.company_id) {
    const { error } = await admin
      .from("companies")
      .update(companyPayload)
      .eq("id", profile.company_id);

    if (error) return { error: error.message };
    return { companyId: profile.company_id };
  }

  const companyId = randomUUID();
  const { error: companyError } = await admin.from("companies").insert({
    id: companyId,
    ...companyPayload,
  });

  if (companyError) return { error: companyError.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ company_id: companyId })
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  const { data: existingRules } = await admin
    .from("quote_upgrade_rules")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!existingRules) {
    await admin.from("quote_upgrade_rules").insert({
      company_id: companyId,
    });
  }

  return { companyId };
}
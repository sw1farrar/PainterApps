import { DEFAULT_COMPANY_FEATURES } from "@/lib/auth/company-features";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Company } from "@/types/database";

export const SITE_ADMIN_SANDBOX_SLUG = "painterapps-site-sandbox";
export const SITE_ADMIN_SANDBOX_NAME = "PainterApps Site Sandbox";

type AdminClient = ReturnType<typeof createAdminClient>;

export function isSiteAdminSandboxCompany(
  company: Pick<Company, "slug"> | null | undefined,
): boolean {
  return company?.slug === SITE_ADMIN_SANDBOX_SLUG;
}

export async function ensureSiteAdminSandbox(
  admin: AdminClient,
): Promise<Company> {
  const { data: existing, error: existingError } = await admin
    .from("companies")
    .select("*")
    .eq("slug", SITE_ADMIN_SANDBOX_SLUG)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  let company = (existing as Company | null) ?? null;

  if (!company) {
    const { data: created, error: createError } = await admin
      .from("companies")
      .insert({
        name: SITE_ADMIN_SANDBOX_NAME,
        slug: SITE_ADMIN_SANDBOX_SLUG,
        onboarding_complete: true,
        enabled_features: DEFAULT_COMPANY_FEATURES,
      })
      .select("*")
      .single();

    if (createError || !created) {
      throw new Error(createError?.message ?? "Could not create site sandbox company.");
    }

    company = created as Company;
  }

  const { error: linkError } = await admin
    .from("profiles")
    .update({ company_id: company.id })
    .eq("is_site_admin", true)
    .is("company_id", null);

  if (linkError) {
    throw new Error(linkError.message);
  }

  return company;
}
"use server";

import { revalidatePath } from "next/cache";

import type {
  ActionResult,
  AdminCompanySummary,
  AdminUserRow,
} from "@/app/app/admin/types";
import { ALL_COMPANY_FEATURES } from "@/lib/auth/company-features";
import {
  ensureSiteAdminSandbox,
  isSiteAdminSandboxCompany,
} from "@/lib/auth/site-admin-sandbox";
import { requireSiteAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Company, CompanyFeature, Profile, UserRole } from "@/types/database";

export type {
  ActionResult,
  AdminCompanySummary,
  AdminUserRow,
} from "@/app/app/admin/types";

async function assertSiteAdmin() {
  const session = await requireSiteAdmin();
  return session;
}

export async function getAdminOverview() {
  await assertSiteAdmin();
  const admin = createAdminClient();
  await ensureSiteAdminSandbox(admin);

  const [{ count: companyCount }, { count: userCount }, { data: companies }] =
    await Promise.all([
      admin.from("companies").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin
        .from("companies")
        .select("id, name, created_at, enabled_features")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const { data: authData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const unconfirmedCount =
    authData.users?.filter((user) => !user.email_confirmed_at).length ?? 0;

  return {
    companyCount: companyCount ?? 0,
    userCount: userCount ?? 0,
    unconfirmedCount,
    recentCompanies: companies ?? [],
  };
}

export async function listAdminCompanies(): Promise<AdminCompanySummary[]> {
  await assertSiteAdmin();
  const admin = createAdminClient();
  await ensureSiteAdminSandbox(admin);

  const { data: companies, error } = await admin
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !companies) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("company_id");

  const counts = new Map<string, number>();
  for (const profile of profiles ?? []) {
    if (!profile.company_id) continue;
    counts.set(profile.company_id, (counts.get(profile.company_id) ?? 0) + 1);
  }

  return (companies as Company[])
    .map((company) => ({
      ...company,
      user_count: counts.get(company.id) ?? 0,
    }))
    .sort((a, b) => {
      const aSandbox = isSiteAdminSandboxCompany(a);
      const bSandbox = isSiteAdminSandboxCompany(b);
      if (aSandbox && !bSandbox) return -1;
      if (!aSandbox && bSandbox) return 1;
      return 0;
    });
}

export async function getAdminCompany(companyId: string): Promise<{
  company: Company;
  users: AdminUserRow[];
} | null> {
  await assertSiteAdmin();
  const admin = createAdminClient();
  await ensureSiteAdminSandbox(admin);

  const { data: company } = await admin
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) return null;

  const { data: profiles } = await admin
    .from("profiles")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  const { data: authData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const authById = new Map(
    (authData.users ?? []).map((user) => [user.id, user]),
  );

  const users: AdminUserRow[] = ((profiles ?? []) as Profile[]).map((profile) => {
    const authUser = authById.get(profile.id);
    return {
      profile,
      email: authUser?.email ?? null,
      email_confirmed: Boolean(authUser?.email_confirmed_at),
      company_name: (company as Company).name,
    };
  });

  return { company: company as Company, users };
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  await assertSiteAdmin();
  const admin = createAdminClient();
  await ensureSiteAdminSandbox(admin);

  const [{ data: profiles }, { data: companies }, { data: authData }] =
    await Promise.all([
      admin.from("profiles").select("*").order("created_at", { ascending: false }),
      admin.from("companies").select("id, name"),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  const companyNames = new Map(
    (companies ?? []).map((company) => [company.id, company.name as string]),
  );
  const authById = new Map(
    (authData.users ?? []).map((user) => [user.id, user]),
  );

  return ((profiles ?? []) as Profile[]).map((profile) => {
    const authUser = authById.get(profile.id);
    return {
      profile,
      email: authUser?.email ?? null,
      email_confirmed: Boolean(authUser?.email_confirmed_at),
      company_name: profile.company_id
        ? (companyNames.get(profile.company_id) ?? null)
        : null,
    };
  });
}

export async function updateCompanyFeatures(
  companyId: string,
  enabledFeatures: CompanyFeature[],
): Promise<ActionResult> {
  await assertSiteAdmin();

  const normalized = ALL_COMPANY_FEATURES.filter((feature) =>
    enabledFeatures.includes(feature),
  );

  if (!normalized.includes("free_tools_sell_sheets")) {
    return {
      success: false,
      error: "Sell sheets access is required for every company.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({ enabled_features: normalized })
    .eq("id", companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/companies");
  revalidatePath(`/app/admin/companies/${companyId}`);
  revalidatePath("/app", "layout");
  return { success: true };
}

export async function setUserSiteAdmin(
  userId: string,
  isSiteAdmin: boolean,
): Promise<ActionResult> {
  const session = await assertSiteAdmin();

  if (session.profile.id === userId && !isSiteAdmin) {
    return { success: false, error: "You cannot remove your own site admin access." };
  }

  const admin = createAdminClient();

  if (!isSiteAdmin) {
    const { count } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_site_admin", true);

    const { data: target } = await admin
      .from("profiles")
      .select("is_site_admin")
      .eq("id", userId)
      .maybeSingle();

    if ((count ?? 0) <= 1 && target?.is_site_admin) {
      return {
        success: false,
        error: "At least one site admin must remain.",
      };
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_site_admin: isSiteAdmin })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/admin/users");
  return { success: true };
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<ActionResult> {
  await assertSiteAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/admin/users");
  return { success: true };
}
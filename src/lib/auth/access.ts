import { cache } from "react";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type AccountRole = "platform_admin" | "owner" | "member";

export type CompanyFeature = "estimate_pro";

export type Access = {
  userId: string;
  companyId: string | null;
  role: AccountRole;
  isPlatformAdmin: boolean;
  isOwner: boolean;
  accessEnabled: boolean;
  features: Record<string, boolean>;
};

function featuresFrom(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      v === true,
    ]),
  );
}

export function hasFeature(
  access: Access | null | undefined,
  feature: CompanyFeature,
): boolean {
  return Boolean(access?.features[feature]);
}

export const currentAccess = cache(async (): Promise<Access | null> => {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("is_platform_admin, access_enabled, account_role, company_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const role = (data.account_role as AccountRole) || "owner";
  const isPlatformAdmin =
    Boolean(data.is_platform_admin) || role === "platform_admin";
  let features: Record<string, boolean> = {};
  if (data.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("features")
      .eq("id", data.company_id)
      .maybeSingle();
    features = featuresFrom(company?.features);
  }
  return {
    userId,
    companyId: data.company_id ?? null,
    role,
    isPlatformAdmin,
    isOwner: role === "owner" || isPlatformAdmin,
    accessEnabled: data.access_enabled === true,
    features,
  };
});

export async function requireAccess(nextPath = "/app"): Promise<Access> {
  const access = await currentAccess();
  if (!access) redirect(`/login?next=${nextPath}`);
  if (!access.accessEnabled) redirect("/login?error=disabled");
  return access;
}

export async function requireFeature(
  feature: CompanyFeature,
  nextPath = "/app",
): Promise<Access> {
  const access = await requireAccess(nextPath);
  if (!hasFeature(access, feature)) redirect("/app");
  return access;
}

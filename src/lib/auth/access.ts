import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type AccountRole = "platform_admin" | "owner" | "member";

export type Access = {
  userId: string;
  companyId: string | null;
  role: AccountRole;
  isPlatformAdmin: boolean;
  isOwner: boolean;
  accessEnabled: boolean;
};

export async function currentAccess(): Promise<Access | null> {
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
  return {
    userId,
    companyId: data.company_id ?? null,
    role,
    isPlatformAdmin,
    isOwner: role === "owner" || isPlatformAdmin,
    accessEnabled: data.access_enabled === true,
  };
}

export async function requireAccess(nextPath = "/app"): Promise<Access> {
  const access = await currentAccess();
  if (!access) redirect(`/login?next=${nextPath}`);
  if (!access.accessEnabled) redirect("/login?error=disabled");
  return access;
}

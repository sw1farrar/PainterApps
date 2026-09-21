import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentAccess, hasFeature } from "@/lib/auth/access";
import { supabaseAdmin } from "@/lib/supabase/server";
import { inviteCompanyUser, removeCompanyMember } from "../access/actions";

export const metadata = { title: "Team" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const access = await currentAccess();
  if (!access) redirect("/login");
  if (!access.isOwner || !hasFeature(access, "estimate_pro")) redirect("/app");
  const { error, notice } = await searchParams;
  const t = await getTranslations("app");
  const db = supabaseAdmin();
  const { data: members } = db && access.companyId
    ? await db
        .from("company_members")
        .select("user_id, role")
        .eq("company_id", access.companyId)
    : { data: [] };
  const { data: invites } = db && access.companyId
    ? await db
        .from("company_invites")
        .select("id,email,created_at")
        .eq("company_id", access.companyId)
        .is("accepted_at", null)
    : { data: [] };
  const { data: users } = db
    ? await db.auth.admin.listUsers({ perPage: 200 })
    : { data: { users: [] } };
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("teamTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("teamHelp")}</p>
      </div>
      {error === "taken" ? (
        <p className="text-sm text-destructive">{t("teamErrorTaken")}</p>
      ) : error === "self" ? (
        <p className="text-sm text-destructive">{t("teamErrorSelf")}</p>
      ) : error === "config" ? (
        <p className="text-sm text-destructive">{t("teamErrorConfig")}</p>
      ) : notice === "invited" ? (
        <p className="text-sm text-muted-foreground">{t("teamNoticeInvited")}</p>
      ) : notice === "added" ? (
        <p className="text-sm text-muted-foreground">{t("teamNoticeAdded")}</p>
      ) : notice === "already" ? (
        <p className="text-sm text-muted-foreground">{t("teamNoticeAlready")}</p>
      ) : null}
      <form action={inviteCompanyUser} className="flex gap-2">
        <Input name="email" type="email" placeholder={t("teamEmail")} required autoComplete="off" />
        <Button type="submit">{t("teamInvite")}</Button>
      </form>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {(members ?? []).map((m) => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              {emailById.get(m.user_id) || m.user_id}
              <span className="ml-2 text-xs text-muted-foreground">
                {m.role === "owner" ? t("roleOwner") : t("roleMember")}
              </span>
            </span>
            {m.user_id !== access.userId ? (
              <form action={removeCompanyMember}>
                <input type="hidden" name="user_id" value={m.user_id} />
                <Button type="submit" size="sm" variant="ghost">
                  {t("teamRemove")}
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {(invites ?? []).length > 0 ? (
        <div>
          <h2 className="text-sm font-medium">{t("teamPending")}</h2>
          <ul className="mt-2 text-sm text-muted-foreground">
            {(invites ?? []).map((i) => (
              <li key={i.id}>{i.email}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

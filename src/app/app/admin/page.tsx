import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { currentAccess } from "@/lib/auth/access";
import { supabaseAdmin } from "@/lib/supabase/server";
import { setAccountAccess } from "../access/actions";

export const metadata = { title: "Access" };

export default async function AdminAccessPage() {
  const access = await currentAccess();
  if (!access?.isPlatformAdmin) redirect("/app");
  const t = await getTranslations("app");
  const db = supabaseAdmin();
  const { data: users } = db
    ? await db.auth.admin.listUsers({ perPage: 200 })
    : { data: { users: [] } };
  const { data: profiles } = db
    ? await db.from("profiles").select("user_id, account_role, access_enabled, company_id, is_editor")
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("adminAccess")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("adminAccessHelp")}</p>
      {!db ? (
        <p className="mt-6 text-sm text-destructive">{t("adminNeedService")}</p>
      ) : null}
      <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
        {(users?.users ?? []).map((u) => {
          const p = byId.get(u.id);
          const enabled = p?.access_enabled !== false;
          return (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  {p?.account_role === "platform_admin"
                    ? t("roleAdmin")
                    : p?.account_role === "member"
                      ? t("roleMember")
                      : t("roleOwner")}
                  {enabled ? "" : ` · ${t("accessOff")}`}
                </p>
              </div>
              {u.id === access.userId ? (
                <span className="text-xs text-muted-foreground">{t("roleAdmin")}</span>
              ) : (
                <form action={setAccountAccess} className="flex items-center gap-2">
                  <input type="hidden" name="user_id" value={u.id} />
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="access_enabled" defaultChecked={enabled} />
                    {t("accessOn")}
                  </label>
                  <Button type="submit" size="sm" variant="outline">
                    {t("saveAccess")}
                  </Button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

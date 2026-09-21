import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { setAccountAccess } from "../../access/actions";
import { setCompanyEstimatePro } from "../actions";
import { Button } from "@/components/ui/button";
import { currentAccess } from "@/lib/auth/access";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Company" };

function estimateProOn(features: unknown) {
  return Boolean(
    features &&
      typeof features === "object" &&
      !Array.isArray(features) &&
      (features as Record<string, unknown>).estimate_pro === true,
  );
}

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const access = await currentAccess();
  if (!access?.isPlatformAdmin) redirect("/app");
  const { companyId } = await params;
  const t = await getTranslations("app");
  const db = supabaseAdmin();
  if (!db) notFound();
  const { data: company } = await db
    .from("companies")
    .select("id,name,features,created_by")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) notFound();
  const { data: members } = await db
    .from("company_members")
    .select("user_id, role")
    .eq("company_id", companyId);
  const { data: profiles } = await db
    .from("profiles")
    .select("user_id, account_role, access_enabled")
    .eq("company_id", companyId);
  const { data: users } = await db.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(
    (users?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );
  const profileById = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const on = estimateProOn(company.features);
  const ownerEmail = company.created_by
    ? emailById.get(company.created_by)
    : "";
  const label = company.name?.trim() || ownerEmail || company.id.slice(0, 8);

  return (
    <div>
      <Link
        href="/app/admin"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        {t("adminBack")}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{label}</h1>
      {ownerEmail ? (
        <p className="mt-1 text-sm text-muted-foreground">{ownerEmail}</p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-medium">{t("adminFeatures")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("adminEstimateProHelp")}
        </p>
        <form action={setCompanyEstimatePro} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="company_id" value={company.id} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="estimate_pro"
              defaultChecked={on}
            />
            {t("adminEstimatePro")}
          </label>
          <Button type="submit" size="sm" variant="outline">
            {t("saveAccess")}
          </Button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium">{t("adminUsers")}</h2>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {(members ?? []).map((m) => {
            const p = profileById.get(m.user_id);
            const enabled = p?.access_enabled !== false;
            const email = emailById.get(m.user_id) ?? m.user_id;
            return (
              <li
                key={m.user_id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{email}</p>
                  <p className="text-xs text-muted-foreground">
                    {p?.account_role === "platform_admin"
                      ? t("roleAdmin")
                      : m.role === "member"
                        ? t("roleMember")
                        : t("roleOwner")}
                    {enabled ? "" : ` · ${t("accessOff")}`}
                  </p>
                </div>
                {m.user_id === access.userId ? (
                  <span className="text-xs text-muted-foreground">
                    {t("roleAdmin")}
                  </span>
                ) : (
                  <form action={setAccountAccess} className="flex items-center gap-2">
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        name="access_enabled"
                        defaultChecked={enabled}
                      />
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
      </section>
    </div>
  );
}

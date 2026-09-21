import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccess } from "@/lib/auth/access";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Companies" };

function estimateProOn(features: unknown) {
  return Boolean(
    features &&
      typeof features === "object" &&
      !Array.isArray(features) &&
      (features as Record<string, unknown>).estimate_pro === true,
  );
}

export default async function AdminCompaniesPage() {
  const access = await currentAccess();
  if (!access?.isPlatformAdmin) redirect("/app");
  const t = await getTranslations("app");
  const db = supabaseAdmin();
  const { data: companies } = db
    ? await db
        .from("companies")
        .select("id,name,features,created_by")
        .order("created_at", { ascending: false })
    : { data: [] };
  const { data: members } = db
    ? await db.from("company_members").select("company_id,user_id")
    : { data: [] };
  const { data: users } = db
    ? await db.auth.admin.listUsers({ perPage: 200 })
    : { data: { users: [] } };
  const emailById = new Map(
    (users?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );
  const countByCompany = new Map<string, number>();
  for (const m of members ?? []) {
    countByCompany.set(
      m.company_id,
      (countByCompany.get(m.company_id) ?? 0) + 1,
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("adminAccess")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("adminAccessHelp")}</p>
      {!db ? (
        <p className="mt-6 text-sm text-destructive">{t("adminNeedService")}</p>
      ) : null}
      {!companies?.length ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("adminNoCompanies")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
          {companies.map((c) => {
            const n = countByCompany.get(c.id) ?? 0;
            const ownerEmail = c.created_by
              ? emailById.get(c.created_by)
              : "";
            const label = c.name?.trim() || ownerEmail || c.id.slice(0, 8);
            const on = estimateProOn(c.features);
            return (
              <li key={c.id}>
                <Link
                  href={`/app/admin/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("adminUserCount", { n })}
                      {ownerEmail ? ` · ${ownerEmail}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("adminEstimatePro")}: {on ? t("adminOn") : t("adminOff")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

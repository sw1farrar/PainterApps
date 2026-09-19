import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { ensureCompany } from "./actions";

export const metadata = { title: "Estimates" };

export default async function EstimatesPage() {
  await ensureCompany();
  const t = await getTranslations("app");
  const userId = await currentUserId();
  const supabase = await createClient();
  const { data: estimates } =
    userId && supabase
      ? await supabase
          .from("estimates")
          .select("id,number,status,zip,totals,created_at,customers(name)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      : { data: [] };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("estimatesTitle")}
        </h1>
        <Button asChild>
          <Link href="/app/estimates/new">{t("newEstimate")}</Link>
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t("estimatesHelp")}</p>
      {!estimates?.length ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("noEstimates")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
          {estimates.map((row) => {
            const totals = (row.totals ?? {}) as { total?: number; hours?: number };
            const customer = Array.isArray(row.customers)
              ? row.customers[0]
              : row.customers;
            return (
              <li key={row.id} className="px-4 py-3">
                <Link href={`/app/estimates/${row.id}`} className="flex justify-between gap-3">
                  <span>
                    #{row.number} {customer?.name ?? t("walkIn")}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {row.status} {row.zip}
                    </span>
                  </span>
                  <span className="font-medium">
                    {totals.total != null
                      ? `$${Number(totals.total).toFixed(0)}`
                      : "—"}
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

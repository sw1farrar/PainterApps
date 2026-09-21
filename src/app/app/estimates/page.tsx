import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { requireFeature } from "@/lib/auth/access";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { deleteEstimate, ensureCompany } from "./actions";

export const metadata = { title: "Estimates" };

export default async function EstimatesPage() {
  await requireFeature("estimate_pro", "/app/estimates");
  await ensureCompany();
  const t = await getTranslations("app");
  const userId = await currentUserId();
  const supabase = await createClient();
  const { data: estimates } =
    userId && supabase
      ? await supabase
          .from("estimates")
          .select("id,number,status,zip,totals,created_at,customers(name)")
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
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link href={`/app/estimates/${row.id}`} className="min-w-0 flex-1">
                  <span>
                    #{row.number} {customer?.name ?? t("walkIn")}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {row.status} {row.zip}
                    </span>
                  </span>
                  <span className="ml-3 font-medium">
                    {totals.total != null
                      ? `$${Number(totals.total).toFixed(0)}`
                      : "—"}
                  </span>
                </Link>
                <ConfirmDelete
                  label={t("delete")}
                  confirmLabel={t("confirmDelete")}
                  action={async () => {
                    "use server";
                    const fd = new FormData();
                    fd.set("id", row.id);
                    await deleteEstimate(fd);
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

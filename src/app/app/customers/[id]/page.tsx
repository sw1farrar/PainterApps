import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { deleteCustomer, saveCustomer } from "../../estimates/actions";

export const metadata = { title: "Customer" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect("/login?next=/app/customers");
  const supabase = await createClient();
  if (!supabase) notFound();
  const t = await getTranslations("app");
  const { data: customer } = await supabase
    .from("customers")
    .select("id,name,phone,email,address,zip,notes")
    .eq("id", id)
    .maybeSingle();
  if (!customer) notFound();
  const { data: estimates } = await supabase
    .from("estimates")
    .select("id,number,status,totals,zip")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        <Link href="/app/customers" className="underline underline-offset-4">
          {t("customersTitle")}
        </Link>
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
        <Button asChild>
          <Link href={`/app/estimates/new?customer=${id}`}>{t("newEstimate")}</Link>
        </Button>
      </div>
      <form action={saveCustomer} className="grid max-w-lg gap-3">
        <input type="hidden" name="id" value={id} />
        <Input name="name" defaultValue={customer.name} required />
        <Input name="phone" defaultValue={customer.phone} placeholder={t("phone")} />
        <Input
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={customer.email}
          placeholder={t("email")}
        />
        <Input name="address" defaultValue={customer.address} placeholder={t("address")} />
        <Input name="zip" defaultValue={customer.zip} placeholder={t("zip")} />
        <Button type="submit">{t("saveCustomer")}</Button>
      </form>
      <form
        action={async () => {
          "use server";
          await deleteCustomer(id);
          redirect("/app/customers");
        }}
      >
        <Button type="submit" variant="ghost">
          {t("delete")}
        </Button>
      </form>
      <section>
        <h2 className="text-lg font-medium">{t("customerEstimates")}</h2>
        {!estimates?.length ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("noEstimates")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {estimates.map((row) => {
              const totals = (row.totals ?? {}) as { total?: number };
              return (
                <li key={row.id} className="px-4 py-3 text-sm">
                  <Link
                    href={`/app/estimates/${row.id}`}
                    className="flex justify-between gap-3 hover:underline"
                  >
                    <span>
                      #{row.number} {row.status} {row.zip}
                    </span>
                    <span className="font-medium">
                      {totals.total != null ? `$${Number(totals.total).toFixed(0)}` : "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

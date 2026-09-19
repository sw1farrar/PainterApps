import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { deleteCustomer, saveCustomer } from "../estimates/actions";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const t = await getTranslations("app");
  const userId = await currentUserId();
  const supabase = await createClient();
  const { data } =
    userId && supabase
      ? await supabase
          .from("customers")
          .select("id,name,phone,email,address,zip")
          .eq("user_id", userId)
          .order("name")
      : { data: [] };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("customersTitle")}</h1>
      <form action={saveCustomer} className="mt-6 grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-2">
        <Input name="name" placeholder={t("customerName")} required />
        <Input name="phone" placeholder={t("phone")} />
        <Input
          name="email"
          placeholder={t("email")}
          type="email"
          autoComplete="off"
        />
        <Input name="zip" placeholder={t("zip")} />
        <Input name="address" placeholder={t("address")} className="sm:col-span-2" />
        <Button type="submit" className="sm:col-span-2">
          {t("addCustomer")}
        </Button>
      </form>
      <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
        {(data ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-muted-foreground">
                {c.phone} {c.zip}
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await deleteCustomer(c.id);
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                {t("delete")}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

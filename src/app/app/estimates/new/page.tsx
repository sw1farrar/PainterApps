import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { createEstimate, ensureCompany } from "../actions";

export const metadata = { title: "New estimate" };

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; zip?: string }>;
}) {
  await ensureCompany();
  const { job, zip } = await searchParams;
  const t = await getTranslations("app");
  const userId = await currentUserId();
  const supabase = await createClient();
  const { data: customers } =
    userId && supabase
      ? await supabase
          .from("customers")
          .select("id,name,zip")
          .order("name")
      : { data: [] };

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("newEstimate")}</h1>
      <form action={createEstimate} className="space-y-3 rounded-2xl border border-border p-4">
        {job ? <input type="hidden" name="job_id" value={job} /> : null}
        <label className="block text-sm">
          {t("customer")}
          <select
            name="customer_id"
            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{t("walkIn")}</option>
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Input name="zip" placeholder={t("zip")} defaultValue={zip ?? ""} />
        <Button type="submit">{t("createEstimate")}</Button>
      </form>
    </div>
  );
}

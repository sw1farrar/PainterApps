import { getLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { UnitsSwitcher } from "@/components/settings/UnitsSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentUnits } from "@/lib/auth/current-units";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";
import { ensureCompany, saveCompanySettings } from "../estimates/actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const t = await getTranslations("app");
  const locale = (await getLocale()) as Locale;
  const units = await currentUnits();
  await ensureCompany();
  const userId = await currentUserId();
  const supabase = await createClient();
  const { data: company } =
    userId && supabase
      ? await supabase
          .from("company_settings")
          .select("company_name,phone,hourly_rate,show_hours_on_proposal")
          .eq("user_id", userId)
          .maybeSingle()
      : { data: null };
  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("settingsTitle")}
      </h1>
      <section>
        <h2 className="text-sm font-medium">{t("language")}</h2>
        <div className="mt-3">
          <LanguageSwitcher locale={locale} />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-medium">{t("units")}</h2>
        <div className="mt-3">
          <UnitsSwitcher units={units} />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-medium">{t("company")}</h2>
        <form action={saveCompanySettings} className="mt-3 space-y-3">
          <Input
            name="company_name"
            placeholder={t("company")}
            defaultValue={company?.company_name ?? ""}
          />
          <Input name="phone" placeholder={t("phone")} defaultValue={company?.phone ?? ""} />
          <Input
            name="hourly_rate"
            type="number"
            step="0.01"
            placeholder={t("hourlyRate")}
            defaultValue={company?.hourly_rate ?? 65}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="show_hours"
              defaultChecked={Boolean(company?.show_hours_on_proposal)}
            />
            {t("showHours")}
          </label>
          <Button type="submit">{t("saveCompany")}</Button>
        </form>
      </section>
      <section>
        <h2 className="text-sm font-medium">{t("notifications")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("notificationsSoon")}
        </p>
      </section>
    </div>
  );
}

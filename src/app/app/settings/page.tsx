import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const t = await getTranslations("app");
  const locale = (await getLocale()) as Locale;
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
        <p className="mt-2 text-sm text-muted-foreground">{t("imperial")}</p>
        <p className="text-sm text-muted-foreground">{t("metric")}</p>
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

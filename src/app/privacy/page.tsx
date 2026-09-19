import { getTranslations } from "next-intl/server";

export const metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const t = await getTranslations();
  return (
    <article className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t("legal.privacyTitle")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("legal.privacyUpdated")}
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>{t("privacy.p1")}</p>
        <p>{t("privacy.p2")}</p>
        <p>{t("privacy.p3")}</p>
        <p>{t("privacy.p4")}</p>
        <p>{t("privacy.p5")}</p>
        <p>{t("privacy.p6")}</p>
        <p>{t("privacy.p7")}</p>
      </div>
    </article>
  );
}

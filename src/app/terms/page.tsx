import { getTranslations } from "next-intl/server";

export const metadata = { title: "Terms of Use" };

export default async function TermsPage() {
  const t = await getTranslations();
  return (
    <article className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t("legal.termsTitle")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("legal.termsUpdated")}
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>{t("terms.p1")}</p>
        <p>{t("terms.p2")}</p>
        <p>{t("terms.p3")}</p>
        <p>{t("terms.p4")}</p>
        <p>{t("terms.p5")}</p>
        <p>{t("terms.p6")}</p>
        <p>{t("terms.p7")}</p>
      </div>
    </article>
  );
}

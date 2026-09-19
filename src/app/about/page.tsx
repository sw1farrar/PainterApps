import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "About",
  description:
    "PainterApps is an independent product for professional painters. Not affiliated with any paint manufacturer.",
};

export default async function AboutPage() {
  const t = await getTranslations("about");
  return (
    <article className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {t("title")}
      </h1>
      <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
        <p>{t("body1")}</p>
        <p>{t("body2")}</p>
        <p>{t("body3")}</p>
      </div>
    </article>
  );
}

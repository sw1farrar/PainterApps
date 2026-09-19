import { getTranslations } from "next-intl/server";

export async function AuthConfigShell() {
  const t = await getTranslations("auth");
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t("shellTitle")}</h1>
      <p className="mt-4 text-muted-foreground">{t("shellBody")}</p>
      <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4 font-mono text-xs text-muted-foreground">
        {t("shellHint")}
      </p>
    </div>
  );
}

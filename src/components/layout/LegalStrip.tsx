import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function LegalStrip() {
  const t = await getTranslations("legal");
  return (
    <footer className="border-t border-border/80 py-4">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-muted-foreground">
        <p>{t("stripNote")}</p>
        <nav className="flex gap-4" aria-label={t("stripNav")}>
          <Link href="/privacy" className="hover:text-foreground">
            {t("privacyLink")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("termsLink")}
          </Link>
          <Link href="/about" className="hover:text-foreground">
            {t("aboutLink")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

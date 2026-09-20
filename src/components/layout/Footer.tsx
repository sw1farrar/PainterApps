import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";

export async function Footer() {
  const t = await getTranslations();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{t("brand.tagline")}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("legal.footerDisclaimer")}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/" className="hover:underline">
            {t("nav.home")}
          </Link>
          <Link href="/news" className="hover:underline">
            {t("nav.news")}
          </Link>
          <Link href="/systems" className="hover:underline">
            {t("nav.systems")}
          </Link>
          <Link href="/calc" className="hover:underline">
            {t("nav.calc")}
          </Link>
          <Link href="/about" className="hover:underline">
            {t("nav.about")}
          </Link>
          <Link href="/privacy" className="hover:underline">
            {t("legal.privacyTitle")}
          </Link>
          <Link href="/terms" className="hover:underline">
            {t("legal.termsTitle")}
          </Link>
        </div>
      </div>
    </footer>
  );
}

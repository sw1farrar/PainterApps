"use client";

import Link from "next/link";
import LanguageToggle from "@/components/LanguageToggle";
import Logo from "@/components/Logo";
import PageShell from "@/components/PageShell";
import { useLanguage } from "@/providers/LanguageProvider";

type HeaderProps = {
  variant?: "marketing" | "minimal";
};

export default function Header({ variant = "marketing" }: HeaderProps) {
  const { t } = useLanguage();
  const nav = t("nav");

  if (variant === "minimal") {
    return (
      <header className="w-full border-b border-white/10 bg-navy-950/80 backdrop-blur-md">
        <PageShell as="nav" className="flex items-center justify-between py-4">
          <Link href="/" aria-label={nav.homeAria}>
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-5 sm:gap-6">
            <Link href="/free-tools" className="type-link">
              {nav.freeTools}
            </Link>
            <LanguageToggle />
          </div>
        </PageShell>
      </header>
    );
  }

  return (
    <header className="fixed top-0 right-0 left-0 z-50 w-full border-b border-silver-400/10 bg-navy-950/75 backdrop-blur-xl">
      <PageShell as="nav" className="flex items-center justify-between py-4 lg:py-5">
        <Link href="/" aria-label={nav.homeAria}>
          <Logo size="md" />
        </Link>

        <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
          <Link href="/free-tools" className="type-link hidden sm:inline">
            {nav.freeTools}
          </Link>
          <Link href="/login" className="type-link hidden md:inline">
            {nav.signIn}
          </Link>
          <LanguageToggle />
          <button className="btn-rugged px-4 py-2 text-sm sm:px-5 sm:py-2.5 lg:px-6 lg:py-3">
            {nav.getEarlyAccess}
          </button>
        </div>
      </PageShell>
    </header>
  );
}
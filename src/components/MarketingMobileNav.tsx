"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import LanguageToggle from "@/components/LanguageToggle";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLanguage } from "@/providers/LanguageProvider";

export default function MarketingMobileNav() {
  const { t } = useLanguage();
  const nav = t("nav");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-silver-400/15 bg-navy-900/50 text-silver-200 backdrop-blur-sm transition hover:border-silver-400/25 hover:text-white md:hidden"
          aria-label={nav.openMenuAria}
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full max-w-xs flex-col gap-0 border-silver-400/10 bg-navy-950/95 p-0 text-silver-200 backdrop-blur-xl sm:max-w-sm"
      >
        <SheetHeader className="border-b border-silver-400/10 px-6 py-5 text-left">
          <SheetTitle className="font-display text-lg text-white">
            {nav.menuTitle}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 px-4 py-6" aria-label={nav.menuTitle}>
          <SheetClose asChild>
            <Link
              href="/free-tools"
              className="rounded-lg px-3 py-3 text-base font-semibold text-silver-200 transition hover:bg-navy-900/60 hover:text-white"
            >
              {nav.freeTools}
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/login"
              className="rounded-lg px-3 py-3 text-base font-semibold text-silver-200 transition hover:bg-navy-900/60 hover:text-white"
            >
              {nav.signIn}
            </Link>
          </SheetClose>

          <div className="mt-4 border-t border-silver-400/10 pt-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-silver-500">
              {nav.languageLabel}
            </p>
            <div className="px-3">
              <LanguageToggle />
            </div>
          </div>
        </nav>

        <div className="border-t border-silver-400/10 px-6 py-5">
          <SheetClose asChild>
            <Link href="/signup" className="btn-rugged w-full justify-center px-6 py-3 text-sm">
              {nav.getEarlyAccess}
            </Link>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
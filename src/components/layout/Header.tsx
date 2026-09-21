"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { AuthButtons } from "./AuthButtons";

const LINKS = [
  { href: "/", key: "home" as const },
  { href: "/systems", key: "systems" as const },
  { href: "/news", key: "news" as const },
  { href: "/calc", key: "calc" as const },
];

export function Header({
  locale,
  authEnabled,
  signedIn,
}: {
  locale: Locale;
  authEnabled: boolean;
  signedIn: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const navLinks = (close: boolean) => {
    const items = [
      ...LINKS.map((link) => ({ href: link.href, label: t(link.key) })),
      ...(signedIn ? [{ href: "/app", label: t("app") }] : []),
    ];
    return items.map((link) => {
      const active =
        link.href === "/"
          ? pathname === "/" || pathname.startsWith("/paintday")
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
      const node = (
        <Link
          href={link.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "text-sm transition-colors",
            active
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      );
      return close ? (
        <SheetClose asChild key={link.href}>
          {node}
        </SheetClose>
      ) : (
        <span key={link.href}>{node}</span>
      );
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full min-w-0 max-w-full overflow-x-clip border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="min-w-0 shrink" aria-label={t("home")}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label={t("primary")}>
          {navLinks(false)}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher locale={locale} />
            <ThemeToggle />
            <AuthButtons authEnabled={authEnabled} signedIn={signedIn} />
          </div>
          {authEnabled && !signedIn ? (
            <Button asChild variant="ghost" size="sm" className="md:hidden">
              <Link href="/login">{t("login")}</Link>
            </Button>
          ) : null}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t("menu")}
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(18rem,calc(100vw-1.5rem))]">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-4 px-4">{navLinks(true)}</nav>
              <div className="mt-8 flex flex-col gap-4 px-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{t("language")}</span>
                  <LanguageSwitcher locale={locale} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{t("theme")}</span>
                  <ThemeToggle />
                </div>
                <AuthButtons authEnabled={authEnabled} signedIn={signedIn} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

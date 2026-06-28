"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import LanguageToggle from "@/components/LanguageToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getUserInitials } from "@/lib/auth/display";
import type { MarketingUser } from "@/lib/auth/marketing-actions";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { useLanguage } from "@/providers/LanguageProvider";

type MarketingMobileNavProps = {
  marketingUser?: MarketingUser | null | undefined;
  loginHref: string;
  showSignIn: boolean;
};

export default function MarketingMobileNav({
  marketingUser = null,
  loginHref,
  showSignIn,
}: MarketingMobileNavProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const nav = t("nav");
  const showSignedInMenu = Boolean(marketingUser);

  async function handleLogout() {
    const envError = getSupabaseEnvError();
    if (envError) {
      toast.error(envError);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-silver-400/15 bg-navy-900/50 text-silver-200 backdrop-blur-sm transition hover:border-silver-400/25 hover:text-white md:hidden"
          aria-label={nav.openMenuAria}
        >
          {showSignedInMenu && marketingUser ? (
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={marketingUser.avatarUrl ?? undefined}
                alt={marketingUser.fullName ?? "User"}
              />
              <AvatarFallback className="bg-navy-700 text-[0.65rem] text-blue-200">
                {getUserInitials(marketingUser.fullName)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full max-w-xs flex-col gap-0 border-silver-400/10 bg-navy-950/95 p-0 text-silver-200 backdrop-blur-xl sm:max-w-sm"
      >
        <SheetHeader className="border-b border-silver-400/10 px-6 py-5 text-left">
          <SheetTitle className="font-display text-lg text-white">
            {showSignedInMenu && marketingUser
              ? marketingUser.fullName ?? "Account"
              : nav.menuTitle}
          </SheetTitle>
          {showSignedInMenu && marketingUser ? (
            <p className="text-sm capitalize text-silver-500">
              {marketingUser.role.replace(/_/g, " ")}
            </p>
          ) : null}
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 px-4 py-6" aria-label={nav.menuTitle}>
          {showSignedInMenu && marketingUser ? (
            <>
              <SheetClose asChild>
                <Link
                  href="/app/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-3 text-base font-semibold text-silver-200 transition hover:bg-navy-900/60 hover:text-white"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/app/profile"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-3 text-base font-semibold text-silver-200 transition hover:bg-navy-900/60 hover:text-white"
                >
                  <User className="h-4 w-4" />
                  Profile settings
                </Link>
              </SheetClose>
              {marketingUser.role === "admin" ? (
                <>
                  <SheetClose asChild>
                    <Link
                      href="/app/settings"
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-3 text-base font-semibold text-silver-200 transition hover:bg-navy-900/60 hover:text-white"
                    >
                      <Settings className="h-4 w-4" />
                      Company settings
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/app/billing"
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-3 text-base font-semibold text-silver-200 transition hover:bg-navy-900/60 hover:text-white"
                    >
                      <CreditCard className="h-4 w-4" />
                      Billing
                    </Link>
                  </SheetClose>
                </>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-3 text-left text-base font-semibold text-red-300 transition hover:bg-navy-900/60"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </>
          ) : null}

          {showSignIn ? (
            <SheetClose asChild>
              <a
                href={loginHref}
                className="block rounded-lg px-3 py-3 text-base font-semibold text-silver-200 transition hover:bg-navy-900/60 hover:text-white"
              >
                {nav.signIn}
              </a>
            </SheetClose>
          ) : null}

          <div className="mt-4 border-t border-silver-400/10 pt-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-silver-500">
              {nav.languageLabel}
            </p>
            <div className="px-3">
              <LanguageToggle />
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import LanguageToggle from "@/components/LanguageToggle";
import Logo from "@/components/Logo";
import MarketingMobileNav from "@/components/MarketingMobileNav";
import { MarketingUserMenu } from "@/components/MarketingUserMenu";
import PageShell from "@/components/PageShell";
import {
  buildLoginHref,
  isFreeToolsPath,
} from "@/lib/auth/login-redirect";
import {
  getMarketingUser,
  type MarketingUser,
} from "@/lib/auth/marketing-actions";
import { useLanguage } from "@/providers/LanguageProvider";

type HeaderProps = {
  variant?: "marketing" | "minimal";
};

export default function Header({ variant = "marketing" }: HeaderProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const nav = t("nav");
  const onFreeTools = isFreeToolsPath(pathname);
  const [marketingUser, setMarketingUser] = React.useState<
    MarketingUser | null | undefined
  >(undefined);

  React.useEffect(() => {
    let cancelled = false;
    setMarketingUser(undefined);

    getMarketingUser()
      .then((user) => {
        if (!cancelled) setMarketingUser(user);
      })
      .catch(() => {
        if (!cancelled) setMarketingUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const showSignIn = !marketingUser;
  const loginHref = buildLoginHref(onFreeTools ? pathname : null);

  if (variant === "minimal") {
    return (
      <header className="w-full border-b border-white/10 bg-navy-950/80 backdrop-blur-md">
        <PageShell as="nav" className="flex items-center justify-between py-4">
          <Link href="/" aria-label={nav.homeAria}>
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-5 sm:gap-6">
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

        <div className="flex items-center gap-3 sm:gap-6 lg:gap-8">
          {marketingUser ? (
            <div className="hidden md:block">
              <MarketingUserMenu user={marketingUser} />
            </div>
          ) : null}
          {showSignIn ? (
            <a
              href={loginHref}
              className="type-link inline-flex shrink-0 text-sm font-semibold text-silver-200 hover:text-white"
            >
              {nav.signIn}
            </a>
          ) : null}
          <div className="block">
            <LanguageToggle />
          </div>
          <MarketingMobileNav
            marketingUser={marketingUser ?? null}
            loginHref={loginHref}
            showSignIn={showSignIn}
          />
        </div>
      </PageShell>
    </header>
  );
}
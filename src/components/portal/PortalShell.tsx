"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/portal/AppSidebar";
import { NavigationRouteSkeleton } from "@/components/portal/NavigationRouteSkeleton";
import { usePortalNavigation } from "@/components/portal/PortalNavigationProvider";
import { SubscriptionBanner } from "@/components/portal/SubscriptionBanner";
import { TopBar } from "@/components/portal/TopBar";
import type { NavItem } from "@/lib/auth/roles";
import { isSiteAdmin, type AppSession } from "@/lib/auth/app-session";


type PortalShellProps = {
  session: AppSession;
  navItems: NavItem[];
  children: React.ReactNode;
};

export function PortalShell({ session, navItems, children }: PortalShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const pathname = usePathname();
  const mainRef = React.useRef<HTMLElement>(null);
  const showSiteAdminLink = isSiteAdmin(session);
  const { isNavigating, pendingHref } = usePortalNavigation();

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return (
    <div className="portal-app-shell portal-shell flex min-h-0 h-dvh overflow-hidden">
      <AppSidebar
        navItems={navItems}
        siteAdminHref={showSiteAdminLink ? "/app/admin" : undefined}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        pendingHref={pendingHref}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-40 shrink-0">
          {session.company ? (
            <SubscriptionBanner
              company={session.company}
              profile={session.profile}
            />
          ) : null}
          <TopBar
            profile={session.profile}
            company={session.company}
            onMenuClick={() => setMobileNavOpen(true)}
          />
        </div>

        <main
          ref={mainRef}
          data-site-scroll-main
          className="site-scroll-main scroll-smooth"
        >
          <div className="mx-auto w-full min-w-0 max-w-7xl p-4 md:p-6 lg:p-8">
            {isNavigating ? (
              <div
                key={pendingHref ?? "navigating"}
                className="page-enter min-w-0"
                aria-busy="true"
                aria-live="polite"
              >
                <NavigationRouteSkeleton href={pendingHref} />
              </div>
            ) : (
              <div key={pathname} className="page-enter min-w-0">
                {children}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
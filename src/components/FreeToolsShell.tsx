"use client";

import { usePathname } from "next/navigation";

import Header from "@/components/Header";
import PageBackground from "@/components/PageBackground";
import { PortalShell } from "@/components/portal/PortalShell";
import { filterNavByRoleAndFeatures } from "@/lib/auth/roles";
import { isFreeToolsPath } from "@/lib/auth/login-redirect";
import type { AppSession } from "@/lib/auth/app-session";

type FreeToolsShellProps = {
  session: AppSession | null;
  children: React.ReactNode;
};

export function FreeToolsShell({ session, children }: FreeToolsShellProps) {
  const pathname = usePathname();

  if (session) {
    const navItems = filterNavByRoleAndFeatures(
      session.profile.role,
      session.company,
    );

    return (
      <PortalShell session={session} navItems={navItems}>
        {children}
      </PortalShell>
    );
  }

  const viewportLocked = isFreeToolsPath(pathname);

  return (
    <PageBackground viewportLocked={viewportLocked}>
      <Header />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-28 lg:pt-32">
        <div
          data-site-scroll-main
          className="site-scroll-main scroll-smooth"
        >
          {children}
        </div>
      </div>
    </PageBackground>
  );
}
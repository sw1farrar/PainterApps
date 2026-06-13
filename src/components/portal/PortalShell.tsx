"use client";

import * as React from "react";

import { AppSidebar } from "@/components/portal/AppSidebar";
import { SubscriptionBanner } from "@/components/portal/SubscriptionBanner";
import { TopBar } from "@/components/portal/TopBar";
import { filterNavByRole } from "@/lib/auth/roles";
import type { AppSession } from "@/lib/auth/session";

type PortalShellProps = {
  session: AppSession;
  children: React.ReactNode;
};

export function PortalShell({ session, children }: PortalShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const navItems = filterNavByRole(session.profile.role);

  return (
    <div className="portal-shell flex min-h-[100dvh]">
      <AppSidebar
        navItems={navItems}
        companyName={session.company?.name}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
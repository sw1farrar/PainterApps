"use client";

import { PortalNavigationProvider } from "@/components/portal/PortalNavigationProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { SitePasswordManagerBoundary } from "@/providers/SitePasswordManagerBoundary";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <SitePasswordManagerBoundary>
        <PortalNavigationProvider>{children}</PortalNavigationProvider>
      </SitePasswordManagerBoundary>
    </LanguageProvider>
  );
}
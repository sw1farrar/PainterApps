"use client";

import { NavigationProgress } from "@/components/NavigationProgress";
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
        <NavigationProgress />
        {children}
      </SitePasswordManagerBoundary>
    </LanguageProvider>
  );
}
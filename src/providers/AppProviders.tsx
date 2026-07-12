"use client";

import { PortalNavigationProvider } from "@/components/portal/PortalNavigationProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { QuoteEditorChromeProvider } from "@/providers/QuoteEditorChromeProvider";
import { SitePasswordManagerBoundary } from "@/providers/SitePasswordManagerBoundary";
import { ThemeProvider } from "@/providers/ThemeProvider";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SitePasswordManagerBoundary>
          <PortalNavigationProvider>
            <QuoteEditorChromeProvider>{children}</QuoteEditorChromeProvider>
          </PortalNavigationProvider>
        </SitePasswordManagerBoundary>
      </LanguageProvider>
    </ThemeProvider>
  );
}
"use client";

import { NavigationProgress } from "@/components/NavigationProgress";
import { LanguageProvider } from "@/providers/LanguageProvider";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <NavigationProgress />
      {children}
    </LanguageProvider>
  );
}
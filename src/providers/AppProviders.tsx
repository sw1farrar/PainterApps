"use client";

import { LanguageProvider } from "@/providers/LanguageProvider";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
"use client";

import Link from "next/link";
import Header from "@/components/Header";
import PageBackground from "@/components/PageBackground";
import PageHeader from "@/components/PageHeader";
import PageShell from "@/components/PageShell";
import { useLanguage } from "@/providers/LanguageProvider";

export default function FreeToolsContent() {
  const { t } = useLanguage();
  const freeTools = t("freeTools");

  const tools = [
    {
      name: freeTools.buildSellSheet.name,
      description: freeTools.buildSellSheet.description,
      href: "/free-tools/build-sell-sheet",
    },
  ];

  return (
    <PageBackground viewportLocked>
      <Header />

      <PageShell
        as="main"
        className="flex min-h-0 flex-1 flex-col overflow-hidden pt-28 lg:pt-32"
      >
        <PageHeader title={freeTools.title} subtitle={freeTools.subtitle} />

        <ul className="mt-8 min-h-0 flex-1 space-y-4 lg:mt-10">
          {tools.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="tool-card surface-panel group block border border-silver-400/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl sm:text-2xl lg:text-3xl">
                    {tool.name}
                  </p>
                  <p className="type-muted mt-2 max-w-2xl text-sm sm:text-base">
                    {tool.description}
                  </p>
                </div>
                <span className="tool-card-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </PageShell>
    </PageBackground>
  );
}
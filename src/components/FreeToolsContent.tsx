"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Check,
  ClipboardList,
  FileStack,
  Lock,
  Palette,
  Sparkles,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import PageShell from "@/components/PageShell";
import { useLanguage } from "@/providers/LanguageProvider";

type FreeToolsContentProps = {
  isLoggedIn?: boolean;
};

const TIER_SWATCHES = [
  { label: "Good", className: "bg-emerald-500/80" },
  { label: "Better", className: "bg-sky-500/80" },
  { label: "Best", className: "bg-amber-400/90" },
];

export default function FreeToolsContent({
  isLoggedIn = false,
}: FreeToolsContentProps) {
  const { t } = useLanguage();
  const freeTools = t("freeTools");
  const sheet = freeTools.buildSellSheet;

  const buildSellSheetHref = isLoggedIn
    ? `/free-tools/build-sell-sheet?new=${Date.now()}`
    : "/free-tools/build-sell-sheet";

  const upcomingTools = [
    {
      icon: Calculator,
      name: freeTools.upcoming.estimate.name,
      teaser: freeTools.upcoming.estimate.teaser,
    },
    {
      icon: Palette,
      name: freeTools.upcoming.color.name,
      teaser: freeTools.upcoming.color.teaser,
    },
    {
      icon: ClipboardList,
      name: freeTools.upcoming.scope.name,
      teaser: freeTools.upcoming.scope.teaser,
    },
  ];

  const features = [
    sheet.featureTiers,
    sheet.featurePdf,
    sheet.featureBrand,
  ];

  return (
    <PageShell as="main" className="pb-16 lg:pb-24">
      <PageHeader title={freeTools.title} subtitle={freeTools.subtitle} />

      <div className="mt-10 space-y-14 lg:mt-14 lg:space-y-20">
        <section aria-labelledby="sell-sheet-feature">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-200">
              <Sparkles className="h-3 w-3" />
              {freeTools.liveBadge}
            </span>
          </div>

          <Link
            id="sell-sheet-feature"
            href={buildSellSheetHref}
            className="free-tools-feature group relative block overflow-hidden rounded-2xl border border-blue-300/20 bg-gradient-to-br from-navy-900/90 via-navy-950/95 to-navy-900/80 p-6 shadow-[0_0_60px_-12px_rgba(43,108,184,0.45)] transition duration-300 hover:border-blue-300/40 hover:shadow-[0_0_80px_-8px_rgba(107,168,232,0.55)] sm:p-8 lg:p-10"
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl transition group-hover:bg-blue-400/25"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl"
              aria-hidden
            />

            <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10">
              <div className="min-w-0 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-blue-200">
                  <FileStack className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-semibold">{sheet.name}</span>
                </div>

                <div>
                  <p className="font-display-accent text-2xl text-amber-100/95 sm:text-3xl lg:text-4xl">
                    {sheet.tagline}
                  </p>
                  <p className="type-lead mt-4 max-w-xl text-sm leading-relaxed text-silver-300 sm:text-base">
                    {sheet.description}
                  </p>
                </div>

                <ul className="space-y-2.5">
                  {features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-silver-200"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-200">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <span className="btn-rugged inline-flex items-center gap-2 px-6 py-3.5 text-sm transition group-hover:gap-3 sm:text-base">
                  {sheet.cta}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>

              <div
                className="relative mx-auto w-full max-w-sm lg:max-w-none"
                aria-hidden
              >
                <div className="surface-panel rotate-1 rounded-xl border border-white/10 bg-navy-950/80 p-5 shadow-2xl transition duration-300 group-hover:rotate-0">
                  <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="h-2 w-16 rounded-full bg-white/20" />
                    <div className="h-6 w-6 rounded-md bg-white/10" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {TIER_SWATCHES.map((tier) => (
                      <div
                        key={tier.label}
                        className="rounded-lg border border-white/10 bg-white/5 p-2.5 sm:p-3"
                      >
                        <div
                          className={`mb-2 h-2 rounded-full ${tier.className}`}
                        />
                        <div className="space-y-1.5">
                          <div className="h-1.5 w-full rounded-full bg-white/15" />
                          <div className="h-1.5 w-4/5 rounded-full bg-white/10" />
                          <div className="h-1.5 w-3/5 rounded-full bg-white/10" />
                        </div>
                        <p className="mt-2 text-[0.6rem] font-bold uppercase tracking-wider text-silver-400">
                          {tier.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-[0.65rem] uppercase tracking-[0.2em] text-silver-500">
                    Preview · PDF · Share
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </section>

        <section aria-labelledby="coming-soon-tools">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="type-eyebrow">{freeTools.comingSoonBadge}</p>
              <h2
                id="coming-soon-tools"
                className="font-display mt-2 text-2xl text-white sm:text-3xl"
              >
                {freeTools.comingSoonTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-silver-400 sm:text-base">
                {freeTools.comingSoonBody}
              </p>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-3">
            {upcomingTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <li
                  key={tool.name}
                  className="surface-panel relative overflow-hidden rounded-xl border border-silver-400/10 p-5 opacity-80"
                >
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-navy-950/40"
                    aria-hidden
                  />
                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-silver-400/15 bg-navy-900/60 text-silver-400">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-silver-400/15 bg-navy-900/50 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-silver-500">
                        <Lock className="h-3 w-3" />
                        Soon
                      </span>
                    </div>
                    <p className="font-display text-lg text-silver-200">
                      {tool.name}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-silver-500">
                      {tool.teaser}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
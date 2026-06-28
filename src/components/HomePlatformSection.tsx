"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  FileStack,
  FileText,
  Landmark,
  LayoutDashboard,
  Lock,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";

import { useLanguage } from "@/providers/LanguageProvider";

const TIER_MOCK = [
  {
    label: "Good",
    bar: "bg-emerald-500/85",
    labelClass: "text-emerald-300/80",
    cardClass: "border-white/10 bg-white/[0.05]",
  },
  {
    label: "Better",
    bar: "bg-sky-500/85",
    labelClass: "text-sky-300/80",
    cardClass: "border-white/10 bg-white/[0.05]",
  },
  {
    label: "Best",
    bar: "bg-amber-400/90",
    labelClass: "text-amber-200/90",
    cardClass:
      "relative -mt-1 scale-[1.05] border-amber-400/30 bg-white/[0.07] shadow-[0_0_16px_-4px_rgba(251,191,36,0.28)]",
  },
] as const;

type SoonTool = {
  id: string;
  icon: typeof FileText;
  name: string;
  teaser: string;
};

export default function HomePlatformSection() {
  const { t } = useLanguage();
  const platform = t("home").platform;

  const comingSoon: SoonTool[] = [
    {
      id: "quotes",
      icon: FileText,
      name: platform.comingSoon.quotes.name,
      teaser: platform.comingSoon.quotes.teaser,
    },
    {
      id: "portals",
      icon: LayoutDashboard,
      name: platform.comingSoon.customerPortals.name,
      teaser: platform.comingSoon.customerPortals.teaser,
    },
    {
      id: "crews",
      icon: Users,
      name: platform.comingSoon.crewSetup.name,
      teaser: platform.comingSoon.crewSetup.teaser,
    },
    {
      id: "schedules",
      icon: CalendarDays,
      name: platform.comingSoon.schedules.name,
      teaser: platform.comingSoon.schedules.teaser,
    },
    {
      id: "billing",
      icon: CreditCard,
      name: platform.comingSoon.billing.name,
      teaser: platform.comingSoon.billing.teaser,
    },
    {
      id: "invoicing",
      icon: Receipt,
      name: platform.comingSoon.invoicing.name,
      teaser: platform.comingSoon.invoicing.teaser,
    },
    {
      id: "accounting",
      icon: Landmark,
      name: platform.comingSoon.accounting.name,
      teaser: platform.comingSoon.accounting.teaser,
    },
  ];

  return (
    <aside
      className="home-features-rail surface-glass animate-fade-up-delay-2 flex w-full min-h-0 flex-col gap-4 rounded-2xl p-4 sm:gap-5 sm:p-5 lg:max-h-[min(520px,62dvh)]"
      aria-label={platform.roadmapTitle}
    >
      <div className="shrink-0">
        <div className="mb-3 flex items-center gap-2">
          <span className="home-features-section-label home-features-section-label--live">
            {platform.liveBadge}
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-blue-400/40 to-transparent" />
        </div>

        <Link
          href="/free-tools/build-sell-sheet"
          className="home-platform-live group relative block overflow-hidden rounded-xl border border-blue-300/30 bg-gradient-to-br from-navy-800/95 via-navy-900 to-navy-950/95 p-4 shadow-[0_0_52px_-12px_rgba(43,108,184,0.5)] transition duration-300 hover:border-blue-300/50 hover:shadow-[0_0_64px_-8px_rgba(107,168,232,0.55)] sm:p-5"
        >
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-blue-500/20 blur-3xl transition group-hover:bg-blue-400/25"
            aria-hidden
          />

          <div className="relative mb-3 flex h-1.5 overflow-hidden rounded-full">
            <div className="flex-1 bg-emerald-500/90" />
            <div className="flex-1 bg-sky-500/90" />
            <div className="flex-1 bg-amber-400/95" />
          </div>

          <div className="relative grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/25 bg-blue-500/15 text-blue-200">
                  <FileStack className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <p className="font-display text-lg text-white sm:text-xl">
                    {platform.sellSheet.name}
                  </p>
                  <p className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-emerald-300/90">
                    <Sparkles className="h-3 w-3" />
                    {platform.liveBadge}
                  </p>
                </div>
              </div>

              <p className="font-display-accent text-base leading-snug text-blue-200 sm:text-lg">
                {platform.sellSheet.tagline}
              </p>

              <ul className="hidden gap-x-4 gap-y-1 sm:flex sm:flex-wrap">
                {platform.sellSheet.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-1.5 text-xs text-silver-300"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/20 text-blue-200">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <span className="type-link inline-flex items-center gap-2 text-sm font-semibold transition group-hover:gap-2.5">
                {platform.sellSheet.cta}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>

            <div
              className="home-platform-sheet-mock mx-auto w-full max-w-[9.5rem] rotate-1 rounded-xl border border-white/12 bg-navy-950/90 p-3 ring-1 ring-blue-300/20 transition duration-300 group-hover:rotate-0 motion-reduce:transition-none sm:mx-0 sm:w-[9.5rem]"
              aria-hidden
            >
              <div className="mb-2 flex items-center justify-between gap-1 border-b border-white/10 pb-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                  <span className="h-2 w-2 rounded-full bg-sky-400/80" />
                  <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                </div>
                <span className="text-[0.45rem] font-bold uppercase tracking-wider text-blue-300/80">
                  Live
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {TIER_MOCK.map((tier) => (
                  <div
                    key={tier.label}
                    className={`rounded-md border p-1.5 ${tier.cardClass}`}
                  >
                    <div className={`mb-1 h-1.5 rounded-full ${tier.bar}`} />
                    <div className="space-y-0.5">
                      <div className="h-0.5 w-full rounded-full bg-white/15" />
                      <div className="h-0.5 w-4/5 rounded-full bg-white/10" />
                      <div className="h-0.5 w-2/3 rounded-full bg-white/8" />
                    </div>
                    <p
                      className={`mt-1.5 text-[0.5rem] font-bold uppercase tracking-wider ${tier.labelClass}`}
                    >
                      {tier.label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-[0.5rem] uppercase tracking-[0.18em] text-silver-500">
                PDF · Web
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <span className="home-features-section-label">{platform.soonBadge}</span>
          <div className="h-px flex-1 bg-gradient-to-r from-silver-500/25 to-transparent" />
        </div>

        <ul className="home-features-soon-grid grid min-h-0 flex-1 gap-2 overflow-hidden sm:grid-cols-2 sm:gap-2.5">
          {comingSoon.map((tool) => {
            const Icon = tool.icon;
            return (
              <li
                key={tool.id}
                className="home-platform-soon group relative flex gap-2.5 rounded-xl border border-white/[0.07] bg-navy-950/50 p-2.5 sm:p-3"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-navy-900/60 text-silver-500">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-sm leading-tight text-silver-300">
                      {tool.name}
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-silver-500/15 bg-navy-950/80 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-silver-600">
                      <Lock className="h-2.5 w-2.5" />
                      {platform.soonLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[0.7rem] leading-snug text-silver-600 sm:text-xs">
                    {tool.teaser}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
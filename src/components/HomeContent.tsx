"use client";

import Image from "next/image";
import Header from "@/components/Header";
import PageShell from "@/components/PageShell";
import { useLanguage } from "@/providers/LanguageProvider";

export default function HomeContent() {
  const { t } = useLanguage();
  const home = t("home");

  const stats = [
    { value: "3×", label: home.stats.faster },
    { value: "40%", label: home.stats.closeRates },
    { value: "0", label: home.stats.spreadsheets },
  ];

  return (
    <div className="h-dvh overflow-hidden bg-navy-950">
      <Header />

      <section className="relative h-dvh overflow-hidden">
        <Image
          src="/hero.jpg"
          alt=""
          fill
          priority
          className="hero-image-grit object-cover"
          sizes="100vw"
        />
        <div className="hero-gradient absolute inset-0" />
        <div className="hero-vignette absolute inset-0" />
        <div className="hero-grid absolute inset-0" />

        <PageShell className="relative z-10 flex h-full flex-col overflow-hidden pt-24 sm:pt-28">
          <div className="flex min-h-0 flex-1 flex-col justify-center py-2 sm:py-4">
            <div className="w-full max-w-4xl xl:max-w-5xl">
              <p className="badge-pill type-eyebrow animate-fade-up mb-4 inline-flex sm:mb-6">
                <span className="badge-pill-dot" />
                {home.badge}
              </p>

              <h1 className="font-display animate-fade-up-delay-1 text-[2.25rem] leading-none sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-[4.5rem]">
                {home.headline}
                <span className="mt-1 block font-display-accent sm:mt-2">
                  {home.headlineAccent}
                </span>
              </h1>

              <p className="type-lead animate-fade-up-delay-2 mt-4 max-w-xl text-sm sm:mt-6 sm:text-base lg:max-w-2xl lg:text-lg">
                {home.subheadline}
              </p>

              <div className="animate-fade-up-delay-3 mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-4">
                <button className="btn-rugged px-6 py-3 text-sm sm:px-8 sm:py-3.5 sm:text-base">
                  {home.joinWaitlist}
                </button>
                <button className="btn-outline-dark px-6 py-3 text-sm sm:px-8 sm:py-3.5 sm:text-base">
                  {home.seeWhatsComing}
                </button>
              </div>
            </div>
          </div>

          <div className="animate-fade-up-delay-4 surface-glass stat-band mt-4 shrink-0 sm:mt-6">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-item">
                <p className="type-stat-value text-3xl sm:text-4xl lg:text-5xl">
                  {stat.value}
                </p>
                <p className="type-stat-label mt-1.5 text-[0.65rem] sm:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </PageShell>
      </section>
    </div>
  );
}
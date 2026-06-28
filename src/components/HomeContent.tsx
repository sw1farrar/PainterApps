"use client";

import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import HomePlatformSection from "@/components/HomePlatformSection";
import LanguageToggle from "@/components/LanguageToggle";
import PageShell from "@/components/PageShell";
import { useLanguage } from "@/providers/LanguageProvider";

export default function HomeContent() {
  const { t } = useLanguage();
  const home = t("home");
  const platform = home.platform;

  return (
    <div className="site-viewport-shell bg-navy-950">
      <Header />

      <section className="home-landing relative min-h-0 flex-1 overflow-hidden">
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

        <PageShell className="home-landing-shell relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="home-landing-grid min-h-0 flex-1 items-center gap-6 py-3 sm:gap-8 sm:py-4 lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div className="home-landing-copy animate-fade-up flex min-h-0 flex-col justify-center lg:pr-2 xl:pr-6">
              <p className="badge-pill type-eyebrow mb-4 inline-flex sm:mb-5">
                <span className="badge-pill-dot" />
                {platform.eyebrow}
              </p>

              <h1 className="font-display home-landing-headline">
                {home.headline}
                <span className="mt-2 block font-display-accent sm:mt-3">
                  {home.headlineAccent}
                </span>
              </h1>

              <p className="type-lead home-landing-lead mt-5 max-w-xl sm:mt-6 lg:max-w-lg">
                {platform.body}
              </p>

              <div className="home-language-banner mt-5 sm:mt-6">
                <p className="text-sm leading-snug text-silver-300 sm:text-base">
                  {home.languageNote}
                </p>
                <div className="mt-3">
                  <LanguageToggle />
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <Link
                  href="/free-tools/build-sell-sheet"
                  className="btn-rugged inline-flex px-7 py-3 text-sm sm:px-9 sm:py-3.5 sm:text-base"
                >
                  {platform.sellSheet.cta}
                </Link>
              </div>
            </div>

            <div className="home-landing-features min-h-0 lg:flex lg:items-center">
              <HomePlatformSection />
            </div>
          </div>
        </PageShell>
      </section>
    </div>
  );
}
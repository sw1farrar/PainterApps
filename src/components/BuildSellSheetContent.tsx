"use client";

import Link from "next/link";
import Header from "@/components/Header";
import PageBackground from "@/components/PageBackground";
import PageHeader from "@/components/PageHeader";
import PageShell from "@/components/PageShell";
import { formatMessage } from "@/i18n";
import { useLanguage } from "@/providers/LanguageProvider";

const tierKeys = ["good", "better", "best"] as const;

export default function BuildSellSheetContent() {
  const { locale, t } = useLanguage();
  const nav = t("nav");
  const sellSheet = t("sellSheet");

  return (
    <PageBackground>
      <Header />

      <PageShell as="main" className="pt-28 lg:pt-32">
        <Link href="/free-tools" className="type-link">
          {nav.backToFreeTools}
        </Link>

        <PageHeader
          className="mt-6 lg:mt-8"
          title={sellSheet.title}
          subtitle={sellSheet.subtitle}
        />

        <form
          key={locale}
          className="surface-form mt-10 w-full space-y-10 rounded-xl p-6 sm:p-8 lg:mt-14 lg:p-10"
        >
          <section>
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <div>
                <label htmlFor="company" className="form-section-title">
                  {sellSheet.companyName}
                </label>
                <input id="company" type="text" className="form-input" />
              </div>
              <div>
                <label htmlFor="project" className="form-section-title">
                  {sellSheet.projectName}
                </label>
                <input id="project" type="text" className="form-input" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="form-section-title">{sellSheet.tiersLegend}</h2>
            <div className="mt-4 grid gap-5 lg:grid-cols-3 lg:gap-6">
              {tierKeys.map((key) => {
                const tierLabel = sellSheet.tierLabels[key];
                const isBest = key === "best";
                return (
                  <div
                    key={key}
                    className={`tier-card space-y-4 ${isBest ? "tier-card-best" : ""}`}
                  >
                    <p className="font-display text-xl text-navy-900">{tierLabel}</p>
                    <div>
                      <label
                        htmlFor={`${key}-name`}
                        className="form-section-title"
                      >
                        {formatMessage(sellSheet.tierName, { tier: tierLabel })}
                      </label>
                      <input
                        id={`${key}-name`}
                        type="text"
                        defaultValue={tierLabel}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${key}-price`}
                        className="form-section-title"
                      >
                        {formatMessage(sellSheet.tierPrice, { tier: tierLabel })}
                      </label>
                      <input
                        id={`${key}-price`}
                        type="text"
                        placeholder={sellSheet.pricePlaceholder}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${key}-details`}
                        className="form-section-title"
                      >
                        {formatMessage(sellSheet.tierDetails, { tier: tierLabel })}
                      </label>
                      <textarea
                        id={`${key}-details`}
                        rows={4}
                        className="form-input resize-y"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end border-t border-silver-300/60 pt-8">
            <button type="button" className="btn-primary px-8 py-3.5">
              {sellSheet.preview}
            </button>
          </div>
        </form>
      </PageShell>
    </PageBackground>
  );
}
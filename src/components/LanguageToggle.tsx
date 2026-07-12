"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import type { Locale } from "@/i18n/types";

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();
  const lang = t("language");

  const options: {
    value: Locale;
    label: string;
    ariaLabel: string;
  }[] = [
    { value: "en", label: lang.english, ariaLabel: lang.englishAria },
    { value: "es", label: lang.spanish, ariaLabel: lang.spanishAria },
  ];

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-card/80 p-1 backdrop-blur-sm"
      role="group"
      aria-label={lang.groupLabel}
    >
      {options.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLocale(option.value)}
            title={option.ariaLabel}
            aria-label={option.ariaLabel}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
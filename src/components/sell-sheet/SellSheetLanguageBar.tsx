"use client";

import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/providers/LanguageProvider";

export function SellSheetLanguageBar() {
  const { t } = useLanguage();
  const sellSheet = t("sellSheet");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-blue-500/15 bg-blue-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-snug text-navy-800">{sellSheet.languageHint}</p>
      <LanguageToggle />
    </div>
  );
}
"use client";

import { Shield } from "lucide-react";
import {
  getWorkmanshipWarrantyOptions,
  isWorkmanshipWarrantyOptionDisabled,
} from "@/lib/sell-sheet/warranty-from-features";
import { useLanguage } from "@/providers/LanguageProvider";

type SellSheetWarrantyLengthPickerProps = {
  id: string;
  legend: string;
  hint: string;
  noneLabel: string;
  inheritedHint: string;
  selectedLabel: string | null;
  inheritedLabel: string | null;
  onChange: (label: string | null) => void;
};

function shortWarrantyLabel(label: string): string {
  const spanishYear = label.match(/(\d+)\s*año/i);
  if (spanishYear) return `${spanishYear[1]} yr`;

  return label
    .replace(/ workmanship warranty$/i, "")
    .replace(/^(\d+)-year$/, "$1 yr");
}

export function SellSheetWarrantyLengthPicker({
  id,
  legend,
  hint,
  noneLabel,
  inheritedHint,
  selectedLabel,
  inheritedLabel,
  onChange,
}: SellSheetWarrantyLengthPickerProps) {
  const { locale } = useLanguage();
  const warrantyOptions = getWorkmanshipWarrantyOptions(locale);
  const inheritedLocked = Boolean(inheritedLabel);

  return (
    <fieldset className="rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-50/80 to-white px-4 py-4">
      <legend className="flex items-center gap-2 text-sm font-bold text-navy-900">
        <Shield className="h-4 w-4 text-blue-600" strokeWidth={2.25} />
        {legend}
      </legend>
      <p className="mt-1 text-sm text-silver-600">{hint}</p>

      <div
        className="mt-3 flex flex-wrap gap-2"
        role="radiogroup"
        aria-labelledby={id}
      >
        {!inheritedLocked ? (
          <button
            type="button"
            role="radio"
            aria-checked={!selectedLabel}
            onClick={() => onChange(null)}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              !selectedLabel
                ? "border-blue-500/40 bg-white text-blue-800 shadow-sm ring-1 ring-blue-500/20"
                : "border-silver-300/80 bg-white/90 text-navy-800 hover:border-blue-500/25 hover:bg-blue-50/40"
            }`}
          >
            {noneLabel}
          </button>
        ) : null}

        {warrantyOptions.map((option) => {
          const selected = selectedLabel === option.label;
          const disabled = isWorkmanshipWarrantyOptionDisabled(
            option.label,
            inheritedLabel,
          );
          const inheritedOnly =
            inheritedLocked &&
            inheritedLabel === option.label &&
            selected;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.label)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                disabled
                  ? "cursor-not-allowed border-silver-200 bg-silver-50 text-silver-400"
                  : selected
                    ? "border-blue-500/40 bg-white text-blue-800 shadow-sm ring-1 ring-blue-500/20"
                    : "border-silver-300/80 bg-white/90 text-navy-800 hover:border-blue-500/25 hover:bg-blue-50/40"
              }`}
            >
              {shortWarrantyLabel(option.label)}
              {inheritedOnly ? (
                <span className="mt-0.5 block text-xs font-medium text-blue-600">
                  {inheritedHint}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
"use client";

import { Home, Sun } from "lucide-react";
import type { SellSheetApplicationType } from "@/types/sell-sheet";

type SellSheetApplicationPickerProps = {
  id: string;
  label: string;
  hint?: string;
  value: SellSheetApplicationType | "";
  onChange: (applicationType: SellSheetApplicationType) => void;
  labels: {
    interior: string;
    exterior: string;
  };
};

const OPTIONS: Array<{
  value: SellSheetApplicationType;
  icon: typeof Home;
}> = [
  { value: "interior", icon: Home },
  { value: "exterior", icon: Sun },
];

export function SellSheetApplicationPicker({
  id,
  label,
  hint,
  value,
  onChange,
  labels,
}: SellSheetApplicationPickerProps) {
  return (
    <fieldset className="max-w-md">
      <legend className="form-section-title">{label}</legend>
      {hint ? <p className="mt-1 text-sm text-silver-600">{hint}</p> : null}

      <div
        className="mt-3 grid grid-cols-2 gap-2"
        role="radiogroup"
        aria-labelledby={id}
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;
          const optionLabel =
            option.value === "interior" ? labels.interior : labels.exterior;

          return (
            <button
              key={option.value}
              id={`${id}-${option.value}`}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                selected
                  ? "border-blue-500/40 bg-gradient-to-br from-blue-50 to-white text-blue-800 shadow-sm ring-1 ring-blue-500/20"
                  : "border-silver-300/80 bg-white text-navy-800 hover:border-blue-500/25 hover:bg-blue-50/40"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${selected ? "text-blue-600" : "text-silver-500"}`}
                strokeWidth={2.25}
              />
              {optionLabel}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
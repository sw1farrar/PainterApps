"use client";

import { useEffect, useRef, useState } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatCurrencyDisplay(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(2);
}

function parseCurrency(text: string): number | null {
  const cleaned = text.replace(/[^0-9.-]/g, "");
  if (cleaned.trim() === "" || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

type EstimateDefaultsCurrencyInputProps = Omit<
  InputProps,
  "value" | "onChange" | "type"
> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** Applied when the field is left empty on blur. Defaults to null. */
  fallback?: number | null;
};

export function EstimateDefaultsCurrencyInput({
  value,
  onChange,
  fallback = null,
  className,
  onFocus,
  onBlur,
  ...props
}: EstimateDefaultsCurrencyInputProps) {
  const [text, setText] = useState(() => formatCurrencyDisplay(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(formatCurrencyDisplay(value));
    }
  }, [value]);

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        aria-hidden
      >
        $
      </span>
      <Input
        type="text"
        inputMode="decimal"
        value={text}
        className={cn("pl-7", className)}
        onFocus={(event) => {
          focusedRef.current = true;
          event.currentTarget.select();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focusedRef.current = false;
          const next = parseCurrency(text) ?? fallback;
          setText(formatCurrencyDisplay(next));
          onChange(next);
          onBlur?.(event);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (next.trim() === "") return;
          const parsed = parseCurrency(next);
          if (parsed != null) onChange(parsed);
        }}
        {...props}
      />
    </div>
  );
}
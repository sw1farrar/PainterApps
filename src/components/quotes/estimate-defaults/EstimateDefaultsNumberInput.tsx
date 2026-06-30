"use client";

import { useEffect, useRef, useState } from "react";
import { Input, type InputProps } from "@/components/ui/input";

function formatDisplayValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return String(value);
}

function commitValue(
  text: string,
  fallback: number | null,
): number | null {
  if (text.trim() === "") return fallback;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type EstimateDefaultsNumberInputProps = Omit<
  InputProps,
  "value" | "onChange" | "type"
> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** Applied when the field is left empty on blur. Defaults to 0; use null for optional fields. */
  fallback?: number | null;
};

export function EstimateDefaultsNumberInput({
  value,
  onChange,
  fallback = 0,
  onFocus,
  onBlur,
  ...props
}: EstimateDefaultsNumberInputProps) {
  const [text, setText] = useState(() => formatDisplayValue(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(formatDisplayValue(value));
    }
  }, [value]);

  return (
    <Input
      type="number"
      value={text}
      onFocus={(event) => {
        focusedRef.current = true;
        event.currentTarget.select();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focusedRef.current = false;
        const next = commitValue(text, fallback);
        setText(formatDisplayValue(next));
        onChange(next);
        onBlur?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (next === "") return;
        const parsed = Number(next);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
      {...props}
    />
  );
}
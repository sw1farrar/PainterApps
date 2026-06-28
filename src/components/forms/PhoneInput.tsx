"use client";

import { Input, type InputProps } from "@/components/ui/input";
import { formatPhoneNumber } from "@/lib/phone";

type PhoneInputProps = Omit<InputProps, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

export function PhoneInput({ value, onChange, ...props }: PhoneInputProps) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(555) 123-4567"
      value={value}
      onChange={(event) => onChange(formatPhoneNumber(event.target.value))}
      {...props}
    />
  );
}
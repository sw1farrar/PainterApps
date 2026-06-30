"use client";

import { AddressAutocompleteInput } from "@/components/forms/AddressAutocompleteInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AddressFields as AddressValue } from "@/lib/address";
import { US_STATES } from "@/lib/address";
import { cn } from "@/lib/utils";

type AddressFieldsProps = {
  idPrefix: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  line1Label?: string;
  showLine2?: boolean;
  showNotes?: boolean;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  required?: boolean;
  compact?: boolean;
};

export function AddressFields({
  idPrefix,
  value,
  onChange,
  line1Label = "Street address",
  showLine2 = true,
  showNotes = false,
  notes = "",
  onNotesChange,
  required = false,
  compact = false,
}: AddressFieldsProps) {
  const set = (key: keyof AddressValue, next: string) => {
    onChange({ ...value, [key]: next });
  };

  const req = required ? " *" : "";

  const fieldGap = compact ? "space-y-1" : "space-y-2";
  const labelClass = compact ? "text-xs" : undefined;
  const inputClass = compact ? "h-9" : undefined;

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div className={fieldGap}>
        <Label htmlFor={`${idPrefix}-address`} className={labelClass}>
          {line1Label}
          {req}
        </Label>
        <AddressAutocompleteInput
          id={`${idPrefix}-address`}
          value={value.address ?? ""}
          placeholder="Start typing street address…"
          showHint={!compact}
          inputClassName={inputClass}
          onValueChange={(next) => set("address", next)}
          onAddressSelect={(address) =>
            onChange({
              ...value,
              address: address.address ?? "",
              address_line2: address.address_line2 ?? value.address_line2 ?? "",
              city: address.city ?? "",
              state: address.state ?? "",
              zip: address.zip ?? "",
            })
          }
        />
      </div>

      {showLine2 ? (
        <div className={fieldGap}>
          <Label htmlFor={`${idPrefix}-address-line2`} className={labelClass}>
            Apt / suite (optional)
          </Label>
          <Input
            id={`${idPrefix}-address-line2`}
            value={value.address_line2 ?? ""}
            onChange={(e) => set("address_line2", e.target.value)}
            placeholder="Unit 4B"
            className={inputClass}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-2 sm:grid-cols-12",
          compact ? "sm:gap-2" : "gap-4",
        )}
      >
        <div className={cn(fieldGap, "sm:col-span-5")}>
          <Label htmlFor={`${idPrefix}-city`} className={labelClass}>
            City
            {req}
          </Label>
          <Input
            id={`${idPrefix}-city`}
            value={value.city ?? ""}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Austin"
            className={inputClass}
          />
        </div>
        <div className={cn(fieldGap, "sm:col-span-4")}>
          <Label htmlFor={`${idPrefix}-state`} className={labelClass}>
            State
            {req}
          </Label>
          <Select
            value={value.state ?? ""}
            onValueChange={(next) => set("state", next)}
          >
            <SelectTrigger id={`${idPrefix}-state`} className={inputClass}>
              <SelectValue placeholder="ST" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {compact
                    ? state.value
                    : `${state.value} — ${state.label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={cn(fieldGap, "sm:col-span-3")}>
          <Label htmlFor={`${idPrefix}-zip`} className={labelClass}>
            ZIP
            {req}
          </Label>
          <Input
            id={`${idPrefix}-zip`}
            value={value.zip ?? ""}
            onChange={(e) => set("zip", e.target.value)}
            placeholder="78701"
            className={inputClass}
            inputMode="numeric"
          />
        </div>
      </div>

      {showNotes && onNotesChange ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-notes`}>Notes (optional)</Label>
          <Textarea
            id={`${idPrefix}-notes`}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Gate code, preferred contact time, pets on site…"
            rows={3}
          />
        </div>
      ) : null}
    </div>
  );
}
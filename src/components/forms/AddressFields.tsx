"use client";

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
}: AddressFieldsProps) {
  const set = (key: keyof AddressValue, next: string) => {
    onChange({ ...value, [key]: next });
  };

  const req = required ? " *" : "";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-address`}>
          {line1Label}
          {req}
        </Label>
        <Input
          id={`${idPrefix}-address`}
          value={value.address ?? ""}
          onChange={(e) => set("address", e.target.value)}
          placeholder="123 Oak Street"
          autoComplete="address-line1"
        />
      </div>

      {showLine2 ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-address-line2`}>Apt / suite (optional)</Label>
          <Input
            id={`${idPrefix}-address-line2`}
            value={value.address_line2 ?? ""}
            onChange={(e) => set("address_line2", e.target.value)}
            placeholder="Unit 4B"
            autoComplete="address-line2"
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-6">
        <div className="space-y-2 sm:col-span-3">
          <Label htmlFor={`${idPrefix}-city`}>
            City
            {req}
          </Label>
          <Input
            id={`${idPrefix}-city`}
            value={value.city ?? ""}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Austin"
            autoComplete="address-level2"
          />
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor={`${idPrefix}-state`}>
            State
            {req}
          </Label>
          <Select
            value={value.state ?? ""}
            onValueChange={(next) => set("state", next)}
          >
            <SelectTrigger id={`${idPrefix}-state`}>
              <SelectValue placeholder="ST" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.value} — {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-zip`}>
            ZIP
            {req}
          </Label>
          <Input
            id={`${idPrefix}-zip`}
            value={value.zip ?? ""}
            onChange={(e) => set("zip", e.target.value)}
            placeholder="78701"
            autoComplete="postal-code"
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
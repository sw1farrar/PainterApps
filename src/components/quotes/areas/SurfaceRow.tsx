"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSurfaceRateOptions } from "@/lib/quotes/area-helpers";
import type { SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import type { Company } from "@/types/database";

type SurfaceRowProps = {
  surface: SurfaceInput;
  company: Company;
  rateSearch: string;
  onChange: (patch: Partial<SurfaceInput>) => void;
  onRemove: () => void;
};

export function SurfaceRow({
  surface,
  company,
  rateSearch,
  onChange,
  onRemove,
}: SurfaceRowProps) {
  const rateOptions = getSurfaceRateOptions(company).filter((option) =>
    rateSearch.trim()
      ? option.label.toLowerCase().includes(rateSearch.trim().toLowerCase())
      : true,
  );

  const qtyLabel =
    surface.rate_type === "linear"
      ? "Linear ft"
      : surface.rate_type === "each"
        ? "Count"
        : "Sq ft";

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-[1fr_repeat(4,minmax(0,1fr))_auto] sm:items-end sm:gap-3">
      <div className="space-y-1">
        <p className="text-xs font-medium capitalize text-muted-foreground">
          Surface
        </p>
        <p className="text-sm font-semibold capitalize text-foreground">
          {surface.surface_type}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{qtyLabel}</p>
        <Input
          type="number"
          min={0}
          value={surface.sq_ft || ""}
          onChange={(e) => onChange({ sq_ft: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Coats</p>
        <Input
          type="number"
          min={1}
          value={surface.coats}
          onChange={(e) => onChange({ coats: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Rate</p>
        <Select
          value={
            rateOptions.find(
              (o) =>
                o.unit_rate === surface.unit_rate &&
                o.rate_type === surface.rate_type,
            )?.id ?? "custom"
          }
          onValueChange={(value) => {
            const match = rateOptions.find((o) => o.id === value);
            if (match) {
              onChange({
                unit_rate: match.unit_rate,
                rate_type: match.rate_type,
              });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Rate" />
          </SelectTrigger>
          <SelectContent>
            {rateOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom rate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Unit $</p>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={surface.unit_rate}
          onChange={(e) => onChange({ unit_rate: Number(e.target.value) })}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={onRemove}
        aria-label="Remove surface"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
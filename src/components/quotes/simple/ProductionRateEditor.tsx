"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resolveSurfaceLaborOverride,
  type SurfaceLaborOverride,
} from "@/lib/quotes/surface-labor-defaults";
import {
  formatProductionRateSummary,
  resolveSurfaceLaborDefaultsFromCompany,
} from "@/lib/quotes/surface-productivity";
import { cn } from "@/lib/utils";
import type { Company, QuoteJobType, QuoteSurfaceKind } from "@/types/database";

type ProductionRateEditorProps = {
  surfaceType: QuoteSurfaceKind;
  rateType: "sqft" | "linear" | "each";
  jobType: QuoteJobType;
  company: Company;
  effective: SurfaceLaborOverride;
  /** Area- or surface-level stored override (not merged with company). */
  stored?: SurfaceLaborOverride | null;
  onChange: (patch: Partial<SurfaceLaborOverride>) => void;
  onReset?: () => void;
  className?: string;
  compact?: boolean;
};

export function ProductionRateEditor({
  surfaceType,
  rateType,
  jobType,
  company,
  effective,
  stored,
  onChange,
  onReset,
  className,
  compact = false,
}: ProductionRateEditorProps) {
  const laborDefaults = resolveSurfaceLaborDefaultsFromCompany(company);
  const system = resolveSurfaceLaborOverride(
    surfaceType,
    jobType,
    laborDefaults,
  );
  const isOverridden = Boolean(
    stored &&
      ((stored.sqFtPerLaborHour != null &&
        stored.sqFtPerLaborHour !== system.sqFtPerLaborHour) ||
        (stored.linearFtPerLaborHour != null &&
          stored.linearFtPerLaborHour !== system.linearFtPerLaborHour) ||
        (stored.hoursPerUnit != null &&
          stored.hoursPerUnit !== system.hoursPerUnit)),
  );

  const summary = formatProductionRateSummary(
    {
      sqFtPerLaborHour: effective.sqFtPerLaborHour ?? null,
      linearFtPerLaborHour: effective.linearFtPerLaborHour ?? null,
      hoursPerUnit: effective.hoursPerUnit ?? null,
      coatBasis: effective.coatBasis ?? 2,
    },
    rateType,
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-muted/15 p-3",
        compact && "p-2.5",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Production rate
        </Label>
        {isOverridden && onReset ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground"
            onClick={onReset}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        ) : null}
      </div>

      <div className="max-w-xs">
        {rateType === "sqft" ? (
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Sq ft / hr
            </Label>
            <Input
              className="h-8 tabular-nums"
              type="number"
              min={1}
              step={1}
              placeholder={String(system.sqFtPerLaborHour ?? "")}
              value={
                stored?.sqFtPerLaborHour != null ? stored.sqFtPerLaborHour : ""
              }
              onChange={(event) => {
                const raw = event.target.value;
                onChange({
                  sqFtPerLaborHour:
                    raw === "" ? null : Number(raw) || null,
                });
              }}
            />
          </div>
        ) : null}

        {rateType === "linear" ? (
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Lin ft / hr
            </Label>
            <Input
              className="h-8 tabular-nums"
              type="number"
              min={1}
              step={0.5}
              placeholder={String(system.linearFtPerLaborHour ?? "")}
              value={
                stored?.linearFtPerLaborHour != null
                  ? stored.linearFtPerLaborHour
                  : ""
              }
              onChange={(event) => {
                const raw = event.target.value;
                onChange({
                  linearFtPerLaborHour:
                    raw === "" ? null : Number(raw) || null,
                });
              }}
            />
          </div>
        ) : null}

        {rateType === "each" ? (
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Hours / unit
            </Label>
            <Input
              className="h-8 tabular-nums"
              type="number"
              min={0.1}
              step={0.1}
              placeholder={String(system.hoursPerUnit ?? "")}
              value={stored?.hoursPerUnit != null ? stored.hoursPerUnit : ""}
              onChange={(event) => {
                const raw = event.target.value;
                onChange({
                  hoursPerUnit: raw === "" ? null : Number(raw) || null,
                });
              }}
            />
          </div>
        ) : null}
      </div>

      {summary ? (
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          {summary}
          {isOverridden ? (
            <span className="text-amber-700/90 dark:text-amber-300/90">
              {" "}
              · customized for this area
            </span>
          ) : (
            <span> · from your defaults</span>
          )}
        </p>
      ) : null}
    </div>
  );
}
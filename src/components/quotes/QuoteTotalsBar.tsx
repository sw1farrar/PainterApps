"use client";

import { formatCurrency } from "@/lib/utils";

type QuoteTotalsBarProps = {
  laborTotal: number;
  materialsTotal: number;
  profitPct: number;
  quoteTotal: number;
  tierLabel?: string;
  compact?: boolean;
};

export function QuoteTotalsBar({
  laborTotal,
  materialsTotal,
  profitPct,
  quoteTotal,
  tierLabel,
  compact = false,
}: QuoteTotalsBarProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs sm:text-sm"
          : "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm"
      }
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">Labor</span>
        <span className="font-semibold text-foreground">
          {formatCurrency(laborTotal)}
        </span>
      </div>
      <span className="hidden text-border sm:inline">·</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">Materials</span>
        <span className="font-semibold text-foreground">
          {formatCurrency(materialsTotal)}
        </span>
      </div>
      <span className="hidden text-border sm:inline">·</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">Profit</span>
        <span className="font-semibold text-foreground">{profitPct}%</span>
        {tierLabel ? (
          <span className="text-xs text-muted-foreground">({tierLabel})</span>
        ) : null}
      </div>
      <div className="ml-auto flex items-baseline gap-1.5">
        <span className="text-muted-foreground">Total</span>
        <span
          className={
            compact
              ? "font-display text-base font-semibold text-foreground sm:text-lg"
              : "type-stat-value text-lg text-foreground"
          }
        >
          {formatCurrency(quoteTotal)}
        </span>
      </div>
    </div>
  );
}
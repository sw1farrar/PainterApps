"use client";

import { ChevronRight } from "lucide-react";
import { formatLaborHours } from "@/lib/quotes/surface-productivity";
import { formatGallons } from "@/lib/quotes/surface-gallons";
import type { SubstrateSummary } from "@/lib/quotes/area-surface-metrics";
import { cn, formatCurrency } from "@/lib/utils";

type SubstrateWorkSummaryCardProps = {
  summary: SubstrateSummary;
  laborOnly?: boolean;
  onClick: () => void;
};

type CardContent = {
  metricsLine: string | null;
  costLine: string | null;
  productLine: string | null;
  totalCost: number;
  isEmpty: boolean;
};

function formatQtyLabel(label: string): string {
  return label.toLowerCase();
}

function buildCardContent(
  summary: SubstrateSummary,
  laborOnly = false,
): CardContent {
  const metricParts: string[] = [];

  if (summary.detailLine) {
    metricParts.push(summary.detailLine);
  } else if (summary.qty > 0) {
    metricParts.push(
      `${summary.qty.toLocaleString()} ${formatQtyLabel(summary.qtyLabel)}`,
    );
  }

  if (!laborOnly && summary.coats > 0) {
    metricParts.push(`${summary.coats} coat${summary.coats === 1 ? "" : "s"}`);
  }

  if (!laborOnly && summary.gallons > 0) {
    metricParts.push(formatGallons(summary.gallons));
  }

  if (summary.prepHours > 0) {
    metricParts.push(`${formatLaborHours(summary.prepHours)} prep`);
  }
  if (summary.laborHours > 0) {
    metricParts.push(`${formatLaborHours(summary.laborHours)} paint`);
  }

  const totalCost = summary.materialCost + summary.laborCost;
  const isEmpty =
    metricParts.length === 0 &&
    totalCost <= 0 &&
    !summary.productName;

  const costParts: string[] = [];
  if (!laborOnly && summary.materialCost > 0) {
    costParts.push(`${formatCurrency(summary.materialCost)} mat`);
  }
  if (summary.laborCost > 0) {
    costParts.push(`${formatCurrency(summary.laborCost)} labor`);
  }

  return {
    metricsLine: metricParts.length > 0 ? metricParts.join(" · ") : null,
    costLine: costParts.length > 0 ? costParts.join(" · ") : null,
    productLine: !laborOnly && summary.productName ? summary.productName : null,
    totalCost,
    isEmpty,
  };
}

export function SubstrateWorkSummaryCard({
  summary,
  laborOnly = false,
  onClick,
}: SubstrateWorkSummaryCardProps) {
  const { metricsLine, costLine, productLine, totalCost, isEmpty } =
    buildCardContent(summary, laborOnly);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-lg border border-border/50 bg-background/25 px-3 py-2 text-left transition-all",
        "hover:border-primary/40 hover:bg-primary/[0.04]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold text-foreground">
              {summary.label}
            </span>
            {totalCost > 0 ? (
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(totalCost)}
                </span>
                <span className="block text-[10px] tabular-nums text-muted-foreground/80">
                  at cost
                </span>
              </span>
            ) : null}
          </div>

          {isEmpty ? (
            <p className="text-xs text-muted-foreground/90">Tap to configure</p>
          ) : (
            <>
              {metricsLine ? (
                <p className="truncate text-xs tabular-nums text-muted-foreground">
                  {metricsLine}
                </p>
              ) : null}
              {costLine ? (
                <p className="truncate text-[11px] tabular-nums text-muted-foreground/85">
                  {costLine}
                </p>
              ) : null}
              {productLine ? (
                <p
                  className="truncate text-[11px] text-muted-foreground/75"
                  title={productLine}
                >
                  {productLine}
                </p>
              ) : null}
            </>
          )}
        </div>

        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        />
      </div>
    </button>
  );
}
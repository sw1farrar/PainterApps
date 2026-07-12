"use client";

import type { JobBidSummary } from "@/lib/quotes/job-bid-summary";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type { JobBidSummary } from "@/lib/quotes/job-bid-summary";

function SummaryStat({
  label,
  value,
  detail,
  accent,
  compact = false,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: "profit" | "margin";
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-center",
        compact ? "px-2 py-1 sm:px-3" : "px-3 py-2.5 sm:px-4 sm:py-3",
      )}
    >
      <p
        className={cn(
          "font-medium uppercase tracking-wider text-muted-foreground/90",
          compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate font-semibold tabular-nums",
          accent === "profit"
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-foreground",
          compact ? "text-xs sm:text-sm" : "text-sm sm:text-base",
        )}
      >
        {value}
      </p>
      {detail && !compact ? (
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

type JobPricingSummaryBarProps = {
  summary: JobBidSummary;
  variant?: "default" | "header";
  className?: string;
};

export function JobPricingSummaryBar({
  summary,
  variant = "default",
  className,
}: JobPricingSummaryBarProps) {
  const hasBid = summary.bidTotal > 0;
  const hasCost = summary.directCost > 0;
  const hasProfit = summary.grossProfit > 0;
  const compact = variant === "header";

  if (compact) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border border-border/50 bg-muted/20",
          className,
        )}
      >
        <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-border/35">
          <SummaryStat
            label="Cost"
            value={hasCost ? formatCurrency(summary.directCost) : "—"}
            compact
          />
          <SummaryStat
            label="Gross profit"
            value={
              hasBid
                ? hasProfit
                  ? formatCurrency(summary.grossProfit)
                  : formatCurrency(0)
                : "—"
            }
            accent="profit"
            compact
          />
          <SummaryStat
            label="Margin"
            value={hasBid && hasProfit ? `${summary.grossMarginPct}%` : "—"}
            accent="margin"
            compact
          />
        </div>
        <div
          className={cn(
            "flex min-w-[5.5rem] shrink-0 flex-col items-end justify-center border-l border-border/40 px-3 sm:min-w-[6.5rem] sm:px-4",
            hasBid && "bg-primary/[0.09]",
          )}
        >
          <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[10px]">
            Bid total
          </span>
          <span
            className={cn(
              "font-display font-semibold tabular-nums",
              hasBid
                ? "text-sm text-foreground sm:text-base"
                : "text-sm text-muted-foreground",
            )}
          >
            {hasBid ? formatCurrency(summary.bidTotal) : "—"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 via-background/50 to-primary/[0.07] shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <div className="grid flex-1 grid-cols-3 divide-x divide-border/35">
          <SummaryStat
            label="Cost"
            value={hasCost ? formatCurrency(summary.directCost) : "—"}
            detail={hasCost ? "At cost" : undefined}
          />
          <SummaryStat
            label="Gross profit"
            value={
              hasBid
                ? hasProfit
                  ? formatCurrency(summary.grossProfit)
                  : formatCurrency(0)
                : "—"
            }
            detail={hasProfit ? "On bid price" : undefined}
            accent="profit"
          />
          <SummaryStat
            label="Margin"
            value={hasBid && hasProfit ? `${summary.grossMarginPct}%` : "—"}
            detail={hasBid && hasProfit ? "On bid price" : undefined}
            accent="margin"
          />
        </div>

        <div
          className={cn(
            "flex items-center justify-between gap-3 border-t border-border/40 px-4 py-3 sm:min-w-[10.5rem] sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0 sm:px-5 sm:py-4",
            hasBid && "bg-primary/[0.09]",
          )}
        >
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
            Bid total
          </span>
          <span
            className={cn(
              "font-display font-semibold tabular-nums",
              hasBid
                ? "text-xl text-foreground sm:text-2xl"
                : "text-lg text-muted-foreground",
            )}
          >
            {hasBid ? formatCurrency(summary.bidTotal) : "—"}
          </span>
        </div>
      </div>

      {hasBid && hasCost ? (
        <p className="border-t border-border/30 bg-muted/15 px-4 py-2 text-[11px] leading-relaxed text-muted-foreground">
          <span className="tabular-nums">
            {formatCurrency(summary.directCost)}
          </span>
          {" cost"}
          {hasProfit ? (
            <>
              {" + "}
              <span className="tabular-nums text-emerald-700/90 dark:text-emerald-300/90">
                {formatCurrency(summary.grossProfit)}
              </span>
              {" profit"}
            </>
          ) : null}
          {" = "}
          <span className="font-medium tabular-nums text-foreground/90">
            {formatCurrency(summary.bidTotal)}
          </span>
          {hasProfit ? (
            <span className="text-muted-foreground/80">
              {" · "}
              {summary.grossMarginPct}% margin
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
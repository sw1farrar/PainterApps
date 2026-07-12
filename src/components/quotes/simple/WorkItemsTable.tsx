"use client";

import { Input } from "@/components/ui/input";
import { formatLaborHours } from "@/lib/quotes/surface-productivity";
import type { AreaSubstrateId } from "@/lib/quotes/area-substrates";
import type { AreaCostBreakdown } from "@/lib/quotes/area-pricing";
import type { AreaOverheadSettings } from "@/lib/quotes/area-overhead";
import type { AreaWorkItemsRollup } from "@/lib/quotes/area-substrate-pricing";
import type { SubstrateMarkupKey } from "@/lib/quotes/substrate-markup";
import {
  markupAmountFromCost,
  sellPriceFromCost,
} from "@/lib/quotes/substrate-markup";
import { grossMarginPctFromParts } from "@/lib/quotes/pricing";
import { formatCurrency, cn } from "@/lib/utils";

export type WorkItemTableRow = {
  key: string;
  description: string;
  quantity: string;
  hours: number;
  materialsCost: number;
  laborCost: number;
  costAtCost: number;
  marginPct: number;
  markupAmount: number;
  lineTotal: number;
  substrateId?: AreaSubstrateId;
  markupKey: SubstrateMarkupKey;
  clickable: boolean;
  coats: number;
  marginEditable?: boolean;
};

function formatSundriesQuantity(settings: AreaOverheadSettings): string {
  if (settings.mode === "fixedAmount") {
    return settings.fixedAmount > 0
      ? formatCurrency(settings.fixedAmount)
      : "—";
  }
  if (settings.materialsPct > 0) {
    return `${settings.materialsPct}% materials`;
  }
  return "—";
}

function formatHoursCell(hours: number): string {
  return hours > 0 ? formatLaborHours(hours) : "—";
}

function formatMoneyCell(amount: number): string {
  return amount > 0 ? formatCurrency(amount) : "—";
}

export function buildWorkItemTableRows(
  rollup: AreaWorkItemsRollup | null,
  options?: {
    breakdown?: AreaCostBreakdown | null;
    overheadSettings?: AreaOverheadSettings;
  },
): WorkItemTableRow[] {
  if (!rollup) return [];

  const rows: WorkItemTableRow[] = rollup.substratePricingRows.map((row) => ({
    key: row.substrateId,
    description: row.label,
    quantity:
      row.detailLine ??
      (row.qty > 0
        ? `${row.qty.toLocaleString()} ${row.qtyLabel.toLowerCase()}`
        : "—"),
    hours: row.prepHours + row.laborHours,
    materialsCost: row.materialCost,
    laborCost: row.laborCost,
    costAtCost: row.costAtCost,
    marginPct: row.marginPct,
    markupAmount: row.markupAmount,
    lineTotal: row.lineTotal,
    substrateId: row.substrateId,
    markupKey: row.substrateId,
    clickable: true,
    coats: row.coats,
  }));

  if (rows.length > 0) {
    const breakdown = options?.breakdown;
    const overheadSettings = options?.overheadSettings;
    const sundriesCost =
      breakdown && overheadSettings
        ? breakdown.overheadCostAtCost
        : rollup.sundriesCost;
    const sundriesMarginPct = rollup.sundriesMarginPct;

    rows.push({
      key: "sundries",
      description: "Sundries & supplies",
      quantity:
        overheadSettings != null
          ? formatSundriesQuantity(overheadSettings)
          : "—",
      hours: 0,
      materialsCost:
        breakdown && overheadSettings
          ? breakdown.overheadMaterialsAmount
          : rollup.sundriesCost,
      laborCost:
        breakdown && overheadSettings
          ? breakdown.overheadLaborAmount
          : 0,
      costAtCost: sundriesCost,
      marginPct: sundriesMarginPct,
      markupAmount: markupAmountFromCost(sundriesCost, sundriesMarginPct),
      lineTotal: sellPriceFromCost(sundriesCost, sundriesMarginPct),
      markupKey: "sundries",
      clickable: false,
      coats: 0,
    });
  }

  return rows;
}

type WorkItemsTableProps = {
  rows: WorkItemTableRow[];
  onRowClick?: (substrateId: AreaSubstrateId) => void;
  onMarginChange?: (markupKey: SubstrateMarkupKey, marginPct: number) => void;
  onCoatsChange?: (substrateId: AreaSubstrateId, coats: number) => void;
  className?: string;
};

export function WorkItemsTable({
  rows,
  onRowClick,
  onMarginChange,
  onCoatsChange,
  className,
}: WorkItemsTableProps) {
  const totals = rows.reduce(
    (acc, row) => ({
      hours: acc.hours + row.hours,
      materialsCost: acc.materialsCost + row.materialsCost,
      laborCost: acc.laborCost + row.laborCost,
      costAtCost: acc.costAtCost + row.costAtCost,
      markupAmount: acc.markupAmount + row.markupAmount,
      lineTotal: acc.lineTotal + row.lineTotal,
    }),
    {
      hours: 0,
      materialsCost: 0,
      laborCost: 0,
      costAtCost: 0,
      markupAmount: 0,
      lineTotal: 0,
    },
  );

  const blendedMarginPct = grossMarginPctFromParts(
    totals.costAtCost,
    totals.lineTotal,
  );

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Turn on substrates above to include them here.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-border/60 bg-background/20",
        className,
      )}
    >
      <table className="w-full min-w-[76rem] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/25 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5">Description</th>
            <th className="px-3 py-2.5">Quantity</th>
            <th className="px-3 py-2.5 text-center">Coats</th>
            <th className="px-3 py-2.5 text-right">Hours</th>
            <th className="px-3 py-2.5 text-right">Materials</th>
            <th className="px-3 py-2.5 text-right">Labor</th>
            <th className="px-3 py-2.5 text-right">Total Cost</th>
            <th className="px-3 py-2.5 text-right">Margin %</th>
            <th className="px-3 py-2.5 text-right">Markup</th>
            <th className="px-3 py-2.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={cn(
                "border-b border-border/40 transition-colors",
                row.clickable &&
                  "cursor-pointer hover:bg-primary/[0.04]",
              )}
              onClick={() => {
                if (row.clickable && row.substrateId && onRowClick) {
                  onRowClick(row.substrateId);
                }
              }}
            >
              <td className="px-3 py-2.5 font-medium text-foreground">
                {row.description}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {row.quantity}
              </td>
              <td
                className="px-3 py-2.5 text-center"
                onClick={(event) => event.stopPropagation()}
              >
                {row.clickable && row.substrateId && onCoatsChange ? (
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    className="mx-auto h-7 w-[3.25rem] px-2 text-center text-xs tabular-nums"
                    value={row.coats}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      onCoatsChange(
                        row.substrateId!,
                        Number.isFinite(next) && next >= 1 ? next : 1,
                      );
                    }}
                  />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                {formatHoursCell(row.hours)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                {formatMoneyCell(row.materialsCost)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                {formatMoneyCell(row.laborCost)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                {formatMoneyCell(row.costAtCost)}
              </td>
              <td
                className="px-3 py-2.5 text-right"
                onClick={(event) => event.stopPropagation()}
              >
                {onMarginChange && row.marginEditable !== false ? (
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    className="ml-auto h-7 w-[4.5rem] px-2 text-right text-xs tabular-nums"
                    value={row.marginPct}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      onMarginChange(
                        row.markupKey,
                        Number.isFinite(next) ? next : 0,
                      );
                    }}
                  />
                ) : (
                  <span className="tabular-nums text-foreground">
                    {row.marginPct > 0 ? `${row.marginPct}%` : "—"}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                {formatMoneyCell(row.markupAmount)}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">
                {formatMoneyCell(row.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30 font-semibold text-foreground">
            <td className="px-3 py-2.5" colSpan={3}>
              Total
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
              {formatHoursCell(totals.hours)}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
              {formatCurrency(totals.materialsCost)}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
              {formatCurrency(totals.laborCost)}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
              {formatCurrency(totals.costAtCost)}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
              {blendedMarginPct > 0 ? `${blendedMarginPct}%` : "—"}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
              {formatCurrency(totals.markupAmount)}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
              {formatCurrency(totals.lineTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
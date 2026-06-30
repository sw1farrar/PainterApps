"use client";

import { Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { lineItemTotal } from "@/lib/quotes/area-helpers";
import { formatCurrency } from "@/lib/utils";
import type { LineItemInput } from "@/app/app/(portal)/quotes/actions";

type AreaBreakdownPaneProps = {
  areaName?: string;
  areaSubtotal: number;
  lineItems: LineItemInput[];
  onAddLineItem: () => void;
  onRegenerate: () => void;
  showRegenerate?: boolean;
  onToggleOptional?: (lineItemIndex: number) => void;
  lineItemIndices?: number[];
};

export function AreaBreakdownPane({
  areaName,
  areaSubtotal,
  lineItems,
  onAddLineItem,
  onRegenerate,
  showRegenerate = true,
  onToggleOptional,
  lineItemIndices,
}: AreaBreakdownPaneProps) {
  let labor = 0;
  let materials = 0;
  for (const item of lineItems) {
    const total = lineItemTotal(item);
    if (item.type === "labor") labor += total;
    else materials += total;
  }
  const tracked = labor + materials;
  const laborPct = tracked > 0 ? Math.round((labor / tracked) * 100) : 50;
  const materialsPct = tracked > 0 ? 100 - laborPct : 50;

  return (
    <Card className="h-full border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Breakdown</CardTitle>
        <CardDescription>
          {areaName ? `${areaName} running total` : "Select an area"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="type-stat-value text-3xl text-foreground">
            {formatCurrency(areaSubtotal)}
          </p>
          <p className="text-xs text-muted-foreground">Area bid price (direct + overhead + margin)</p>
        </div>

        <div className="space-y-2">
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-primary transition-all"
              style={{ width: `${laborPct}%` }}
            />
            <div
              className="bg-primary/40 transition-all"
              style={{ width: `${materialsPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Labor {formatCurrency(labor)}</span>
            <span>Materials {formatCurrency(materials)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Line items
          </p>
          {lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Generate from measurements or add manual items.
            </p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {lineItems.map((item, index) => {
                const globalIndex = lineItemIndices?.[index];
                return (
                  <li
                    key={`${item.description}-${index}`}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {item.type}
                        </Badge>
                        <span className="truncate">{item.description}</span>
                        {item.is_optional ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Optional
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {onToggleOptional && globalIndex !== undefined ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={
                            item.is_optional
                              ? "Mark as required in base price"
                              : "Mark optional for customer"
                          }
                          onClick={() => onToggleOptional(globalIndex)}
                        >
                          {item.is_optional ? (
                            <ToggleRight className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ToggleLeft className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      ) : null}
                      <span className="font-medium">
                        {formatCurrency(lineItemTotal(item))}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {showRegenerate ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRegenerate}
            >
              Regenerate this area
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={onAddLineItem}>
            <Plus className="h-4 w-4" />
            Quick line item
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
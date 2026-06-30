"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { LineItemInput } from "@/app/app/(portal)/quotes/actions";

type LineItemsStepProps = {
  lineItems: LineItemInput[];
  subtotal: number;
  quoteTotals: {
    beforeTax: number;
    total: number;
    tax: number;
  };
  hasRooms: boolean;
  onGenerateFromRooms: () => void;
  onAddLineItem: () => void;
  onEditLineItem: (index: number) => void;
  onRemoveLineItem: (index: number) => void;
};

export function LineItemsStep({
  lineItems,
  subtotal,
  quoteTotals,
  hasRooms,
  onGenerateFromRooms,
  onAddLineItem,
  onEditLineItem,
  onRemoveLineItem,
}: LineItemsStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Review line items
          </h2>
          <p className="text-sm text-muted-foreground">
            Per-area items are managed in Areas. This view shows everything for
            review. Direct costs: {formatCurrency(subtotal)} · With overhead:{" "}
            {formatCurrency(quoteTotals.beforeTax)}
            {quoteTotals.tax > 0
              ? ` · Total w/ tax: ${formatCurrency(quoteTotals.total)}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onGenerateFromRooms}
            disabled={!hasRooms}
          >
            Generate from rooms
          </Button>
          <Button size="sm" onClick={onAddLineItem}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {lineItems.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-10 text-center text-muted-foreground">
            <p>
              Add labor, materials, and extras — or generate from your room
              estimates using company pricing defaults.
            </p>
            {hasRooms ? (
              <Button variant="outline" onClick={onGenerateFromRooms}>
                Generate from rooms
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {lineItems.map((item, index) => {
            const lineTotal =
              item.qty * item.unit_cost * (1 + item.markup / 100);
            return (
              <Card key={`${item.description}-${index}`}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {item.type}
                      </Badge>
                      <p className="font-semibold text-foreground">
                        {item.description}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.qty} × {formatCurrency(item.unit_cost)} +{" "}
                      {item.markup}% markup = {formatCurrency(lineTotal)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${item.description}`}
                      onClick={() => onEditLineItem(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${item.description}`}
                      onClick={() => onRemoveLineItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
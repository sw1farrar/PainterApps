"use client";

import { useMemo, useState } from "react";
import { Plus, Search, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { lineItemTotal } from "@/lib/quotes/area-helpers";
import {
  QUOTE_OPTION_PRESETS,
  type OptionPreset,
} from "@/lib/quotes/option-presets";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { LineItemInput } from "@/app/app/(portal)/quotes/actions";

type OptionsStepProps = {
  lineItems: LineItemInput[];
  materialMarkup: number;
  onAddPreset: (preset: OptionPreset) => void;
  onToggleOptional: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onAddCustomOptional: () => void;
};

export function OptionsStep({
  lineItems,
  materialMarkup,
  onAddPreset,
  onToggleOptional,
  onRemoveItem,
  onAddCustomOptional,
}: OptionsStepProps) {
  const [query, setQuery] = useState("");

  const optionalItems = useMemo(
    () =>
      lineItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.is_optional),
    [lineItems],
  );

  const enabledOptional = optionalItems.filter(({ item }) => item.is_optional);

  const filteredPresets = QUOTE_OPTION_PRESETS.filter((preset) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      preset.label.toLowerCase().includes(q) ||
      preset.description.toLowerCase().includes(q)
    );
  });

  const alreadyAdded = (preset: OptionPreset) =>
    lineItems.some((item) => item.description.startsWith(preset.label));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Option catalog</CardTitle>
            <CardDescription>
              Tap to add customer-selectable extras. They appear as toggles on
              the proposal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search options…"
                className="pl-9"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredPresets.map((preset) => {
                const added = alreadyAdded(preset);
                const previewTotal =
                  preset.qty *
                  preset.unit_cost *
                  (1 + preset.markup / 100);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={added}
                    onClick={() => onAddPreset(preset)}
                    aria-pressed={added}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      added
                        ? "cursor-not-allowed border-border/60 bg-muted/20 opacity-60"
                        : "border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    <p className="font-semibold text-foreground">
                      {preset.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {preset.description}
                    </p>
                    <p className="mt-2 text-sm font-medium text-primary">
                      +{formatCurrency(previewTotal)}
                    </p>
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddCustomOptional}
            >
              <Plus className="h-4 w-4" />
              Custom optional item
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer options</CardTitle>
            <CardDescription>
              {enabledOptional.length} optional add-on
              {enabledOptional.length === 1 ? "" : "s"} on this quote
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {optionalItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No optional items yet. Add from the catalog or toggle optional
                on line items in the area breakdown.
              </p>
            ) : (
              optionalItems.map(({ item, index }) => (
                <div
                  key={`opt-${index}-${item.description}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {item.type}
                      </Badge>
                      <p className="truncate text-sm font-medium">
                        {item.description}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(lineItemTotal(item))}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={
                        item.is_optional
                          ? "Optional for customer"
                          : "Included in base"
                      }
                      onClick={() => onToggleOptional(index)}
                    >
                      {item.is_optional ? (
                        <ToggleRight className="h-4 w-4 text-primary" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Materials at your cost; job price uses overhead + margin. Customer toggles
          update the live preview in Polish.
        </p>
      </div>
    </div>
  );
}
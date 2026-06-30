"use client";

import { Copy, RefreshCw, Search, Trash2 } from "lucide-react";
import { AddAreaSelector } from "@/components/quotes/areas/AddAreaSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AreasFloatingBarProps = {
  rateSearch: string;
  onRateSearchChange: (value: string) => void;
  onAddArea: (name: string) => void;
  onOpenCustomArea: () => void;
  onRegenerateAll: () => void;
  showRegenerate?: boolean;
  bulkSelectionCount?: number;
  onBulkDuplicate?: () => void;
  onBulkDelete?: () => void;
  onBulkMarkOptional?: () => void;
  onBulkMarkRequired?: () => void;
  /** Fixed above mobile nav on small screens; inline toolbar on desktop. */
  variant?: "fixed" | "inline";
  className?: string;
};

export function AreasFloatingBar({
  rateSearch,
  onRateSearchChange,
  onAddArea,
  onOpenCustomArea,
  onRegenerateAll,
  showRegenerate = true,
  bulkSelectionCount = 0,
  onBulkDuplicate,
  onBulkDelete,
  onBulkMarkOptional,
  onBulkMarkRequired,
  variant = "fixed",
  className,
}: AreasFloatingBarProps) {
  const hasBulk = bulkSelectionCount > 0;
  const isInline = variant === "inline";

  return (
    <div
      className={cn(
        isInline
          ? "rounded-lg border border-border/60 bg-muted/20 px-3 py-3"
          : "fixed inset-x-0 bottom-[4.75rem] z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:hidden",
        className,
      )}
    >
      {hasBulk ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {bulkSelectionCount} area{bulkSelectionCount === 1 ? "" : "s"} selected
          </span>
          <Button type="button" size="sm" variant="outline" onClick={onBulkDuplicate}>
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onBulkMarkOptional}
          >
            Mark optional
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onBulkMarkRequired}
          >
            Mark required
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onBulkDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <AddAreaSelector onAdd={onAddArea} onOpenCustom={onOpenCustomArea} />
          {showRegenerate ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRegenerateAll}
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate all
            </Button>
          ) : null}
        </div>
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={rateSearch}
            onChange={(e) => onRateSearchChange(e.target.value)}
            placeholder="Filter rates…"
            className="h-9 pl-9"
          />
        </div>
      </div>
    </div>
  );
}
"use client";

import { useMemo, type ReactNode } from "react";
import { ListFilter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ManufacturerFilterCombobox } from "@/components/products/ManufacturerFilterCombobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  CompanyPaintProductRole,
  PaintProductSource,
} from "@/types/database";

export type RoleFilter = "all" | CompanyPaintProductRole;
export type SourceFilter = "all" | PaintProductSource;
export type ApplicationFilter = "all" | "interior" | "exterior" | "both";
export type SelfPrimingFilter = "all" | "yes" | "no";
export type StatusFilter = "all" | "active" | "inactive";

export type CatalogFilters = {
  query: string;
  role: RoleFilter;
  source: SourceFilter;
  applicationType: ApplicationFilter;
  selfPriming: SelfPrimingFilter;
  status: StatusFilter;
  manufacturer: string;
};

type CatalogFilterToolbarProps = {
  filters: CatalogFilters;
  onChange: <K extends keyof CatalogFilters>(
    key: K,
    value: CatalogFilters[K],
  ) => void;
  onClear: () => void;
  filteredCount: number;
  totalCount: number;
  manufacturerOptions: string[];
  manufacturersLoading?: boolean;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
};

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All applications" },
  { value: "topcoat", label: "Topcoat" },
  { value: "primer", label: "Primer" },
  { value: "sealer", label: "Sealer" },
  { value: "undercoater", label: "Undercoater" },
];

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "catalog", label: "Platform" },
  { value: "custom", label: "Custom" },
];

const APPLICATION_OPTIONS: { value: ApplicationFilter; label: string }[] = [
  { value: "all", label: "All scopes" },
  { value: "interior", label: "Interior" },
  { value: "exterior", label: "Exterior" },
  { value: "both", label: "Interior & exterior" },
];

const SELF_PRIMING_OPTIONS: { value: SelfPrimingFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "all", label: "All" },
  { value: "inactive", label: "Inactive" },
];

function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function advancedFilterCount(filters: CatalogFilters) {
  let count = 0;
  if (filters.role !== "all") count += 1;
  if (filters.source !== "all") count += 1;
  if (filters.applicationType !== "all") count += 1;
  if (filters.selfPriming !== "all") count += 1;
  if (filters.manufacturer.trim()) count += 1;
  return count;
}

function hasActiveChips(filters: CatalogFilters) {
  return (
    filters.query.trim().length > 0 ||
    filters.role !== "all" ||
    filters.source !== "all" ||
    filters.applicationType !== "all" ||
    filters.selfPriming !== "all" ||
    filters.status !== "active" ||
    filters.manufacturer.trim().length > 0
  );
}

export function CatalogFilterToolbar({
  filters,
  onChange,
  onClear,
  filteredCount,
  totalCount,
  manufacturerOptions,
  manufacturersLoading = false,
  filtersOpen,
  onFiltersOpenChange,
}: CatalogFilterToolbarProps) {
  const advancedCount = advancedFilterCount(filters);
  const showChips = hasActiveChips(filters);

  const chips = useMemo(() => {
    const items: { key: keyof CatalogFilters; label: string; value: string }[] =
      [];

    if (filters.role !== "all") {
      items.push({
        key: "role",
        label: "Application",
        value: labelFor(ROLE_OPTIONS, filters.role),
      });
    }
    if (filters.source !== "all") {
      items.push({
        key: "source",
        label: "Source",
        value: labelFor(SOURCE_OPTIONS, filters.source),
      });
    }
    if (filters.applicationType !== "all") {
      items.push({
        key: "applicationType",
        label: "Scope",
        value: labelFor(APPLICATION_OPTIONS, filters.applicationType),
      });
    }
    if (filters.selfPriming !== "all") {
      items.push({
        key: "selfPriming",
        label: "Self-priming",
        value: labelFor(SELF_PRIMING_OPTIONS, filters.selfPriming),
      });
    }
    if (filters.status !== "active") {
      items.push({
        key: "status",
        label: "Status",
        value: labelFor(STATUS_OPTIONS, filters.status),
      });
    }
    if (filters.manufacturer.trim()) {
      items.push({
        key: "manufacturer",
        label: "Manufacturer",
        value: filters.manufacturer.trim(),
      });
    }
    if (filters.query.trim()) {
      items.push({
        key: "query",
        label: "Search",
        value: `"${filters.query.trim()}"`,
      });
    }

    return items;
  }, [filters]);

  const clearChip = (key: keyof CatalogFilters) => {
    switch (key) {
      case "query":
        onChange("query", "");
        break;
      case "role":
        onChange("role", "all");
        break;
      case "source":
        onChange("source", "all");
        break;
      case "applicationType":
        onChange("applicationType", "all");
        break;
      case "selfPriming":
        onChange("selfPriming", "all");
        break;
      case "status":
        onChange("status", "active");
        break;
      case "manufacturer":
        onChange("manufacturer", "");
        break;
    }
  };

  const clearAdvancedFilters = () => {
    onChange("role", "all");
    onChange("source", "all");
    onChange("applicationType", "all");
    onChange("selfPriming", "all");
    onChange("manufacturer", "");
  };

  return (
    <>
      <div className="border-b border-border/80 bg-navy-900/40 px-3 py-2 backdrop-blur-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(event) => onChange("query", event.target.value)}
              placeholder="Search name, manufacturer, sheen…"
              className="h-8 border-input/80 bg-navy-950/50 pl-8 pr-8 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-blue-400/50"
              aria-label="Search products"
            />
            {filters.query ? (
              <button
                type="button"
                onClick={() => onChange("query", "")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onChange("status", value as StatusFilter)
              }
            >
              <SelectTrigger
                className="h-8 w-[7.5rem] border-border/80 bg-transparent text-xs"
                aria-label="Filter by status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 border-border/80 bg-transparent px-2.5 text-xs text-muted-foreground hover:bg-navy-800/60 hover:text-foreground",
                advancedCount > 0 && "border-blue-400/30 text-foreground",
              )}
              onClick={() => onFiltersOpenChange(true)}
            >
              <ListFilter className="h-3.5 w-3.5" />
              Filters
              {advancedCount > 0 ? (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {advancedCount}
                </span>
              ) : null}
            </Button>

            <p className="hidden text-xs text-muted-foreground lg:inline">
              {filteredCount} of {totalCount}
            </p>
          </div>
        </div>

        {showChips ? (
          <div className="mt-2 flex items-center gap-2 border-t border-border/50 pt-2">
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scrollbar-none">
              {chips.map((chip) => (
                <FilterChip
                  key={`${chip.key}-${chip.value}`}
                  label={chip.label}
                  value={chip.value}
                  onRemove={() => clearChip(chip.key)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <Dialog open={filtersOpen} onOpenChange={onFiltersOpenChange}>
        <DialogContent className="gap-0 p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="text-base">Filters</DialogTitle>
            <DialogDescription className="text-xs">
              Refine your catalog by product attributes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-4 py-4">
            <FilterField label="Application">
              <Select
                value={filters.role}
                onValueChange={(value) =>
                  onChange("role", value as RoleFilter)
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Source">
              <Select
                value={filters.source}
                onValueChange={(value) =>
                  onChange("source", value as SourceFilter)
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Scope">
              <Select
                value={filters.applicationType}
                onValueChange={(value) =>
                  onChange("applicationType", value as ApplicationFilter)
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Self-priming">
              <SegmentedControl
                options={SELF_PRIMING_OPTIONS}
                value={filters.selfPriming}
                onChange={(value) => onChange("selfPriming", value)}
              />
            </FilterField>

            <FilterField label="Manufacturer">
              <ManufacturerFilterCombobox
                manufacturers={manufacturerOptions}
                value={filters.manufacturer}
                onChange={(value) => onChange("manufacturer", value)}
                loading={manufacturersLoading}
                className="w-full"
              />
            </FilterField>
          </div>

          <DialogFooter className="border-t border-border px-4 py-3 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={clearAdvancedFilters}
            >
              Reset filters
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onFiltersOpenChange(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-blue-400/25 bg-navy-700/50 px-2.5 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="max-w-[8rem] truncate font-medium text-foreground">
        {value}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-md border border-border p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  query: "",
  role: "all",
  source: "all",
  applicationType: "all",
  selfPriming: "all",
  status: "all",
  manufacturer: "",
};
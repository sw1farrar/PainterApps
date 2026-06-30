"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Check, Loader2, PenLine, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  browseCatalogProducts,
  importCatalogProduct,
  listCatalogManufacturers,
  saveCustomPaintProduct,
  type CatalogProductBrowseRow,
} from "@/app/app/(portal)/paint-library/actions";
import { AppDrawer } from "@/components/portal/AppDrawer";
import { CustomProductAiLookupPanel } from "@/components/products/CustomProductAiLookupPanel";
import { CustomProductAttributesForm } from "@/components/products/CustomProductAttributesForm";
import { ManufacturerFilterCombobox } from "@/components/products/ManufacturerFilterCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlatformProductMatch } from "@/lib/product-catalog/find-platform-product-matches";
import { DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON } from "@/lib/paint-library/coverage";
import {
  createDefaultCustomProductForm,
  customProductFormToSaveInput,
  type CustomProductFormValues,
} from "@/lib/paint-library/custom-product-form";
import { formatApplicationType } from "@/lib/product-catalog/product-attribute-display";
import {
  cn,
  formatMoneyInputOnBlur,
  parseMoneyInput,
} from "@/lib/utils";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import type { CompanyPaintProductRole } from "@/types/database";

type AddMode = "platform" | "custom";

type CategoryFilter = "all" | "paint" | "primer" | "sealer" | "undercoater";
type ApplicationFilter = "all" | "interior" | "exterior" | "both";

type PlatformFilters = {
  query: string;
  category: CategoryFilter;
  applicationType: ApplicationFilter;
  manufacturer: string;
};

type PlatformProductLookupProps = {
  open: boolean;
  onClose: () => void;
  companyCoverage: number;
  existingCatalogProductIds: Set<string>;
  onImported: (product?: CompanyPaintProductRow) => void;
  initialMode?: AddMode;
};

const DEFAULT_PLATFORM_FILTERS: PlatformFilters = {
  query: "",
  category: "all",
  applicationType: "all",
  manufacturer: "",
};

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "paint", label: "Paint" },
  { value: "primer", label: "Primer" },
  { value: "sealer", label: "Sealer" },
  { value: "undercoater", label: "Undercoater" },
];

const APPLICATION_OPTIONS: { value: ApplicationFilter; label: string }[] = [
  { value: "all", label: "All scopes" },
  { value: "interior", label: "Interior" },
  { value: "exterior", label: "Exterior" },
  { value: "both", label: "Int. & ext." },
];

function categoryLabel(value: string) {
  if (value === "primer") return "Primer";
  if (value === "sealer") return "Sealer";
  if (value === "undercoater") return "Undercoater";
  return "Paint";
}

function catalogCategoryToRole(category: string): CompanyPaintProductRole {
  if (category === "primer" || category === "undercoater") return "primer";
  if (category === "sealer") return "sealer";
  return "topcoat";
}

function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function hasActiveChips(filters: PlatformFilters) {
  return (
    filters.query.trim().length > 0 ||
    filters.category !== "all" ||
    filters.applicationType !== "all" ||
    filters.manufacturer.trim().length > 0
  );
}

export function PlatformProductLookup({
  open,
  onClose,
  companyCoverage,
  existingCatalogProductIds,
  onImported,
  initialMode = "platform",
}: PlatformProductLookupProps) {
  const [mode, setMode] = useState<AddMode>(initialMode);
  const [filters, setFilters] = useState<PlatformFilters>(DEFAULT_PLATFORM_FILTERS);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [manufacturersLoading, setManufacturersLoading] = useState(false);
  const [catalog, setCatalog] = useState<CatalogProductBrowseRow[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [localAddedIds, setLocalAddedIds] = useState<Set<string>>(() => new Set());
  const [unitCostById, setUnitCostById] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [customJustAdded, setCustomJustAdded] = useState(false);
  const [customForm, setCustomForm] = useState<CustomProductFormValues>(() =>
    createDefaultCustomProductForm(companyCoverage),
  );
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [manualSectionsOpen, setManualSectionsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setFilters(DEFAULT_PLATFORM_FILTERS);
    setLocalAddedIds(new Set());
    setCustomJustAdded(false);
    setManualSectionsOpen(false);
    setCustomForm(createDefaultCustomProductForm(companyCoverage));
  }, [open, initialMode, companyCoverage]);

  useEffect(() => {
    if (!open) return;
    setManufacturersLoading(true);
    void listCatalogManufacturers().then((result) => {
      setManufacturersLoading(false);
      if (result.success) setManufacturers(result.data);
    });
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "platform") return;
    startTransition(async () => {
      const result = await browseCatalogProducts({
        query: filters.query,
        category: filters.category === "all" ? undefined : filters.category,
        applicationType:
          filters.applicationType === "all" ? undefined : filters.applicationType,
        manufacturer: filters.manufacturer.trim() || undefined,
      });
      if (result.success) {
        setCatalog(result.data);
      } else {
        toast.error(result.error);
        setCatalog([]);
      }
    });
  }, [open, mode, filters]);

  const chips = useMemo(() => {
    const items: { key: keyof PlatformFilters; label: string; value: string }[] =
      [];

    if (filters.category !== "all") {
      items.push({
        key: "category",
        label: "Type",
        value: labelFor(CATEGORY_OPTIONS, filters.category),
      });
    }
    if (filters.applicationType !== "all") {
      items.push({
        key: "applicationType",
        label: "Scope",
        value: labelFor(APPLICATION_OPTIONS, filters.applicationType),
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

  const updateFilter = <K extends keyof PlatformFilters>(
    key: K,
    value: PlatformFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearChip = (key: keyof PlatformFilters) => {
    switch (key) {
      case "query":
        updateFilter("query", "");
        break;
      case "category":
        updateFilter("category", "all");
        break;
      case "applicationType":
        updateFilter("applicationType", "all");
        break;
      case "manufacturer":
        updateFilter("manufacturer", "");
        break;
    }
  };

  const clearAllFilters = () => {
    setFilters(DEFAULT_PLATFORM_FILTERS);
  };

  const handleImport = (item: CatalogProductBrowseRow) => {
    const unitCost = parseMoneyInput(unitCostById[item.id] ?? "0.00");
    setImportingId(item.id);
    startTransition(async () => {
      const result = await importCatalogProduct({
        paintProductId: item.id,
        unitCost,
        coverageSqftPerGallon:
          item.coverage_sqft_per_gallon ??
          DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
      });
      setImportingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setLocalAddedIds((current) => new Set(current).add(item.id));
      toast.success(`${item.name} added to your catalog`);
      onImported(result.data);
    });
  };

  const handleUsePlatformMatch = (match: PlatformProductMatch) => {
    setMode("platform");
    setFilters({
      ...DEFAULT_PLATFORM_FILTERS,
      query: match.name,
      manufacturer: match.manufacturerName,
      applicationType:
        match.applicationType === "interior" ||
        match.applicationType === "exterior"
          ? match.applicationType
          : "all",
    });
    toast.info(`Showing "${match.name}" in the platform catalog.`);
  };

  const handleSaveCustom = () => {
    if (!customForm.name.trim()) return;
    setIsSavingCustom(true);
    startTransition(async () => {
      const result = await saveCustomPaintProduct(
        customProductFormToSaveInput(customForm, companyCoverage),
      );
      setIsSavingCustom(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const addedName = customForm.name.trim();
      setCustomForm(createDefaultCustomProductForm(companyCoverage));
      setCustomJustAdded(true);
      toast.success(`${addedName} added to your catalog`);
      onImported(result.data);
    });
  };

  const showChips = hasActiveChips(filters);

  return (
    <AppDrawer
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Add product"
      description="Browse the platform catalog or create your own custom product. Imports copy product details into your private catalog — you can change anything later without affecting the platform."
      className={
        mode === "custom"
          ? "md:w-[760px] md:max-w-[760px]"
          : "md:w-[640px] md:max-w-[640px]"
      }
    >
      <div className="space-y-4">
        <div className="flex rounded-lg border border-border p-0.5">
          <ModeTab
            active={mode === "platform"}
            onClick={() => setMode("platform")}
            icon={<Search className="h-3.5 w-3.5" />}
            label="Platform catalog"
          />
          <ModeTab
            active={mode === "custom"}
            onClick={() => setMode("custom")}
            icon={<PenLine className="h-3.5 w-3.5" />}
            label="Custom product"
          />
        </div>

        {mode === "platform" ? (
          <>
            <div className="space-y-2 rounded-lg border border-border/80 bg-navy-900/30 p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.query}
                  onChange={(event) => updateFilter("query", event.target.value)}
                  placeholder="Search product name…"
                  className="h-8 border-input/80 bg-navy-950/50 pl-8 pr-8 text-sm"
                  aria-label="Search platform catalog"
                />
                {filters.query ? (
                  <button
                    type="button"
                    onClick={() => updateFilter("query", "")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={filters.category}
                  onValueChange={(value) =>
                    updateFilter("category", value as CategoryFilter)
                  }
                >
                  <SelectTrigger
                    className="h-8 w-[7.25rem] border-border/80 bg-transparent text-xs"
                    aria-label="Filter by type"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.applicationType}
                  onValueChange={(value) =>
                    updateFilter("applicationType", value as ApplicationFilter)
                  }
                >
                  <SelectTrigger
                    className="h-8 w-[7.25rem] border-border/80 bg-transparent text-xs"
                    aria-label="Filter by scope"
                  >
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

                <ManufacturerFilterCombobox
                  manufacturers={manufacturers}
                  loading={manufacturersLoading}
                  value={filters.manufacturer}
                  onChange={(value) => updateFilter("manufacturer", value)}
                />

                <p className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
                  {isPending && !importingId ? "Searching…" : `${catalog.length} results`}
                </p>
              </div>

              {showChips ? (
                <div className="flex items-center gap-2 border-t border-border/50 pt-2">
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
                    onClick={clearAllFilters}
                    className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>

            {isPending && !importingId ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            <div className="space-y-3">
              {catalog.map((item) => {
                const justAdded = localAddedIds.has(item.id);
                const alreadyAdded =
                  existingCatalogProductIds.has(item.id) || justAdded;
                const role = catalogCategoryToRole(item.category);

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-card/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.manufacturer_name} · {categoryLabel(item.category)} ·{" "}
                          {formatApplicationType(
                            item.application_type as "interior" | "exterior" | "both",
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{role}</Badge>
                          {item.is_self_priming ? (
                            <Badge variant="secondary">Self-priming</Badge>
                          ) : null}
                          {item.sheen ? (
                            <Badge variant="outline">{item.sheen}</Badge>
                          ) : null}
                        </div>
                      </div>
                      {alreadyAdded ? (
                        <Badge
                          className={cn(
                            "shrink-0",
                            justAdded &&
                              "border-green-500/40 bg-green-500/15 text-green-400",
                          )}
                        >
                          {justAdded ? (
                            <>
                              <Check className="mr-1 h-3 w-3" />
                              Added
                            </>
                          ) : (
                            "In your catalog"
                          )}
                        </Badge>
                      ) : (
                        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                          <div className="space-y-1">
                            <Label
                              htmlFor={`import-cost-${item.id}`}
                              className="text-xs text-muted-foreground"
                            >
                              Your cost ($/gal)
                              <span className="sr-only">
                                Private to your company
                              </span>
                            </Label>
                            <Input
                              id={`import-cost-${item.id}`}
                              type="text"
                              inputMode="decimal"
                              className="h-8 w-28"
                              placeholder="0.00"
                              value={unitCostById[item.id] ?? "0.00"}
                              onChange={(event) =>
                                setUnitCostById((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              onBlur={(event) =>
                                setUnitCostById((current) => ({
                                  ...current,
                                  [item.id]: formatMoneyInputOnBlur(event.target.value),
                                }))
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            disabled={importingId === item.id}
                            onClick={() => handleImport(item)}
                          >
                            {importingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="mr-1 h-4 w-4" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!catalog.length && !isPending ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No platform products match your filters.
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={() => setMode("custom")}
                  >
                    Create a custom product instead
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {customJustAdded ? (
              <div className="flex items-center gap-2 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-400">
                <Check className="h-4 w-4 shrink-0" />
                <span>Product added. Add another below.</span>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Private pricing — your cost is saved to your company only and is
              never shared with other PainterApps companies.
            </p>
            <CustomProductAttributesForm
              values={customForm}
              createMode
              manualSectionsOpen={manualSectionsOpen}
              onManualSectionsOpenChange={setManualSectionsOpen}
              onChange={(next) => {
                setCustomJustAdded(false);
                setCustomForm(next);
              }}
              afterBasicSection={
                <CustomProductAiLookupPanel
                  form={customForm}
                  onFormChange={(next) => {
                    setCustomJustAdded(false);
                    setCustomForm(next);
                  }}
                  onUsePlatformMatch={handleUsePlatformMatch}
                  onLookupApplied={() => setManualSectionsOpen(true)}
                />
              }
            />
            <Button
              type="button"
              className="w-full"
              disabled={!customForm.name.trim() || isSavingCustom}
              onClick={handleSaveCustom}
            >
              {isSavingCustom ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to catalog
                </>
              )}
            </Button>
          </div>
        )}
      </div>

    </AppDrawer>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
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
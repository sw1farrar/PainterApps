"use client";

import { useMemo, useState } from "react";
import {
  Check,
  DoorOpen,
  LayoutGrid,
  Layers,
  Minus,
  Paintbrush,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SimpleStepHeader } from "@/components/quotes/simple/SimpleStepHeader";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import {
  BASELINE_SCOPE_LABELS,
  BASELINE_SURFACE_CATEGORIES,
  baselineScopesForJobType,
  primaryBaselineScope,
  type BaselineApplicationScope,
  type BaselinePaintSystemInput,
  type BaselineSurfaceCategory,
} from "@/lib/quotes/baseline-paint";
import { cn } from "@/lib/utils";
import type { QuoteJobType } from "@/types/database";

type SimpleBaselineProductsStepProps = {
  jobType: QuoteJobType;
  systems: BaselinePaintSystemInput[];
  paintProducts: CompanyPaintProductRow[];
  onChange: (
    scope: BaselineApplicationScope,
    category: BaselineSurfaceCategory,
    patch: Partial<BaselinePaintSystemInput>,
  ) => void;
};

const SURFACE_ICONS: Record<BaselineSurfaceCategory, typeof LayoutGrid> = {
  wall: LayoutGrid,
  trim: Minus,
  door: DoorOpen,
  ceiling: Layers,
};

function productsForScopeAndRole(
  products: CompanyPaintProductRow[],
  scope: BaselineApplicationScope,
  role: "primer" | "topcoat",
): CompanyPaintProductRow[] {
  return products.filter((product) => {
    if (!product.is_active || product.role !== role) return false;
    const app = product.application_type ?? "interior";
    if (scope === "interior") {
      return app === "interior" || app === "both";
    }
    return app === "exterior" || app === "both";
  });
}

function productsForScopeAndRoleWithSelection(
  products: CompanyPaintProductRow[],
  scope: BaselineApplicationScope,
  role: "primer" | "topcoat",
  selectedProductId: string | null | undefined,
): CompanyPaintProductRow[] {
  const filtered = productsForScopeAndRole(products, scope, role);
  if (!selectedProductId) return filtered;
  if (filtered.some((product) => product.id === selectedProductId)) {
    return filtered;
  }
  const selected = products.find(
    (product) => product.id === selectedProductId && product.role === role,
  );
  return selected ? [selected, ...filtered] : filtered;
}

function isSurfaceConfigured(row: BaselinePaintSystemInput): boolean {
  return Boolean(row.topcoat_product_id);
}

function systemsStepDescription(jobType: QuoteJobType): string {
  if (jobType === "both") {
    return "Set default primer and topcoat for each surface. Interior and exterior systems flow into every area — start with walls, then match trim, doors, and ceilings.";
  }
  if (jobType === "exterior") {
    return "Choose the primer and topcoat systems your crew will use on exterior surfaces. Wall topcoat is required to continue.";
  }
  return "Choose the primer and topcoat systems your crew will use on interior surfaces. Wall topcoat is required to continue.";
}

function SurfaceSystemCard({
  scope,
  category,
  label,
  row,
  paintProducts,
  onChange,
  isPrimaryWall,
}: {
  scope: BaselineApplicationScope;
  category: BaselineSurfaceCategory;
  label: string;
  row: BaselinePaintSystemInput;
  paintProducts: CompanyPaintProductRow[];
  onChange: SimpleBaselineProductsStepProps["onChange"];
  isPrimaryWall: boolean;
}) {
  const Icon = SURFACE_ICONS[category];
  const configured = isSurfaceConfigured(row);
  const primers = useMemo(
    () =>
      productsForScopeAndRoleWithSelection(
        paintProducts,
        scope,
        "primer",
        row.primer_product_id,
      ),
    [paintProducts, scope, row.primer_product_id],
  );
  const topcoats = useMemo(
    () =>
      productsForScopeAndRoleWithSelection(
        paintProducts,
        scope,
        "topcoat",
        row.topcoat_product_id,
      ),
    [paintProducts, scope, row.topcoat_product_id],
  );

  const primerName = row.primer_product_id
    ? paintProducts.find((p) => p.id === row.primer_product_id)?.name
    : null;
  const topcoatName = row.topcoat_product_id
    ? paintProducts.find((p) => p.id === row.topcoat_product_id)?.name
    : null;

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border bg-card/40 p-4 transition-colors",
        configured
          ? "border-primary/25 bg-primary/[0.04] shadow-sm"
          : "border-border/60",
        isPrimaryWall && !configured && "ring-1 ring-primary/20",
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              configured
                ? "bg-primary/15 text-primary"
                : "bg-muted/50 text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            {isPrimaryWall ? (
              <p className="text-[11px] text-primary/90">Required to continue</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Optional — inherits wall if unset
              </p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
            configured
              ? "bg-primary text-primary-foreground"
              : "border border-dashed border-border/80 bg-background/40",
          )}
          aria-hidden
        >
          {configured ? (
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          ) : null}
        </span>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Primer
          </Label>
          <Select
            value={row.primer_product_id ?? "__none__"}
            onValueChange={(value) =>
              onChange(scope, category, {
                primer_product_id: value === "__none__" ? null : value,
                ...(value === "__none__"
                  ? { primer_spot_prime: false }
                  : {}),
              })
            }
          >
            <SelectTrigger className="h-9 bg-background/60 text-sm">
              <SelectValue placeholder="None — topcoat only" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None — topcoat only</SelectItem>
              {primers.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {primerName ? (
            <p className="truncate text-[11px] text-muted-foreground">{primerName}</p>
          ) : null}
        </div>

        {row.primer_product_id ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                checked={row.primer_spot_prime}
                onChange={(e) =>
                  onChange(scope, category, {
                    primer_spot_prime: e.target.checked,
                    primer_coats: e.target.checked ? 1 : row.primer_coats || 1,
                  })
                }
              />
              <span className="text-xs text-foreground">Spot prime</span>
              <span className="text-[10px] text-muted-foreground">10% of full coat</span>
            </label>
            {!row.primer_spot_prime ? (
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-muted-foreground">Coats</Label>
                <Input
                  className="h-7 w-14 bg-background/80 text-center text-xs"
                  type="number"
                  min={1}
                  max={5}
                  value={row.primer_coats}
                  onChange={(e) =>
                    onChange(scope, category, {
                      primer_coats: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Topcoat
          </Label>
          <Select
            value={row.topcoat_product_id ?? "__none__"}
            onValueChange={(value) =>
              onChange(scope, category, {
                topcoat_product_id: value === "__none__" ? null : value,
              })
            }
          >
            <SelectTrigger
              className={cn(
                "h-9 bg-background/60 text-sm",
                isPrimaryWall &&
                  !row.topcoat_product_id &&
                  "border-primary/30",
              )}
            >
              <SelectValue placeholder="Select topcoat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not set</SelectItem>
              {topcoats.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {topcoatName ? (
            <p className="truncate text-[11px] font-medium text-foreground/90">
              {topcoatName}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Label className="text-[10px] text-muted-foreground">Topcoat coats</Label>
          <Input
            className="h-7 w-14 bg-background/80 text-center text-xs"
            type="number"
            min={1}
            max={5}
            value={row.topcoat_coats}
            onChange={(e) =>
              onChange(scope, category, {
                topcoat_coats: Number(e.target.value) || 1,
              })
            }
          />
        </div>
      </div>
    </article>
  );
}

export function SimpleBaselineProductsStep({
  jobType,
  systems,
  paintProducts,
  onChange,
}: SimpleBaselineProductsStepProps) {
  const scopes = baselineScopesForJobType(jobType);
  const [activeScope, setActiveScope] = useState<BaselineApplicationScope>(
    () => primaryBaselineScope(jobType),
  );

  const systemsByKey = useMemo(
    () =>
      new Map(
        systems.map((row) => [
          `${row.application_scope}:${row.surface_category}`,
          row,
        ]),
      ),
    [systems],
  );

  const scopedRows = useMemo(
    () =>
      BASELINE_SURFACE_CATEGORIES.map(({ key, label }) => {
        const row =
          systemsByKey.get(`${activeScope}:${key}`) ??
          ({
            application_scope: activeScope,
            surface_category: key,
            primer_product_id: null,
            topcoat_product_id: null,
            primer_coats: 1,
            topcoat_coats: 2,
            primer_spot_prime: false,
          } satisfies BaselinePaintSystemInput);
        return { key, label, row };
      }),
    [activeScope, systemsByKey],
  );

  const configuredCount = scopedRows.filter((s) => isSurfaceConfigured(s.row)).length;
  const wallConfigured = isSurfaceConfigured(
    scopedRows.find((s) => s.key === "wall")?.row ?? scopedRows[0].row,
  );

  const scopeProgress = useMemo(() => {
    const byScope = scopes.map((scope) => {
      const rows = BASELINE_SURFACE_CATEGORIES.map(
        ({ key }) =>
          systemsByKey.get(`${scope}:${key}`) ?? {
            topcoat_product_id: null,
          },
      );
      const done = rows.filter((r) => Boolean(r.topcoat_product_id)).length;
      return { scope, done, total: BASELINE_SURFACE_CATEGORIES.length };
    });
    return byScope;
  }, [scopes, systemsByKey]);

  return (
    <section className="space-y-6">
      <SimpleStepHeader
        title="Paint systems"
        description={systemsStepDescription(jobType)}
      />

      <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/25 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Paintbrush className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {configuredCount} of {BASELINE_SURFACE_CATEGORIES.length} surfaces
              on {BASELINE_SCOPE_LABELS[activeScope].toLowerCase()}
            </p>
            <p className="text-xs text-muted-foreground">
              {wallConfigured
                ? "Wall system set — ready for areas"
                : "Select a wall topcoat to continue"}
            </p>
          </div>
        </div>

        {scopes.length > 1 ? (
          <div
            className="inline-flex rounded-lg border border-border/60 bg-muted/20 p-1"
            role="tablist"
            aria-label="Interior or exterior"
          >
            {scopes.map((scope) => {
              const progress = scopeProgress.find((p) => p.scope === scope);
              const isActive = activeScope === scope;
              return (
                <button
                  key={scope}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveScope(scope)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {BASELINE_SCOPE_LABELS[scope]}
                  {progress ? (
                    <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
                      {progress.done}/{progress.total}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="inline-flex rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
            {BASELINE_SCOPE_LABELS[scopes[0]]}
          </span>
        )}
      </div>

      <div
        className="grid gap-4 sm:grid-cols-2"
        role="tabpanel"
        aria-label={`${BASELINE_SCOPE_LABELS[activeScope]} paint systems`}
      >
        {scopedRows.map(({ key, label, row }) => (
          <SurfaceSystemCard
            key={`${activeScope}-${key}`}
            scope={activeScope}
            category={key}
            label={label}
            row={row}
            paintProducts={paintProducts}
            onChange={onChange}
            isPrimaryWall={key === "wall"}
          />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        These defaults apply to every area in the next step. You can override
        products per area later.
      </p>
    </section>
  );
}
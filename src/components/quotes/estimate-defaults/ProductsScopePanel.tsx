"use client";

import { Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EstimateDefaultsNumberInput } from "@/components/quotes/estimate-defaults/EstimateDefaultsNumberInput";
import { ONBOARDING_DEFAULTS } from "@/lib/onboarding/defaults";
import type { CompanyEstimateDefaults } from "@/lib/quotes/company-estimate-defaults";
import {
  BASELINE_SCOPE_LABELS,
  BASELINE_SURFACE_CATEGORIES,
  baselineRowKey,
  type BaselineApplicationScope,
  type BaselinePaintSystemInput,
  type BaselineSurfaceCategory,
} from "@/lib/quotes/baseline-paint";
import {
  resolveTierPaintConfig,
  type CompanyPaintProductRow,
  type TierPaintConfigInput,
} from "@/lib/paint-library/types";
import { buildProductsMap } from "@/lib/quotes/paint-quote-helpers";
import {
  ESTIMATE_TIER_SETUP_DESCRIPTIONS,
  ESTIMATE_UPGRADE_TIERS,
  QUOTE_TIER_LABELS,
} from "@/lib/quotes/tier-labels";
import { cn } from "@/lib/utils";

function productsForScopeAndRole(
  products: CompanyPaintProductRow[],
  scope: BaselineApplicationScope,
  role: "primer" | "topcoat",
): CompanyPaintProductRow[] {
  return products.filter((product) => {
    if (!product.is_active || product.role !== role) return false;
    const app = product.application_type ?? "interior";
    if (scope === "interior") return app === "interior" || app === "both";
    return app === "exterior" || app === "both";
  });
}

function emptyBaselineRow(
  scope: BaselineApplicationScope,
  category: BaselineSurfaceCategory,
): BaselinePaintSystemInput {
  return {
    application_scope: scope,
    surface_category: category,
    primer_product_id: null,
    topcoat_product_id: null,
    primer_coats: 1,
    topcoat_coats: 2,
    primer_spot_prime: false,
  };
}

function ProductSelect({
  value,
  options,
  placeholder = "Not set",
  onValueChange,
}: {
  value: string | null;
  options: CompanyPaintProductRow[];
  placeholder?: string;
  onValueChange: (productId: string | null) => void;
}) {
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(next) =>
        onValueChange(next === "__none__" ? null : next)
      }
    >
      <SelectTrigger className="h-9 w-full text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{placeholder}</SelectItem>
        {options.map((product) => (
          <SelectItem key={product.id} value={product.id}>
            {product.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CoatStepper({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <EstimateDefaultsNumberInput
        className="h-8 w-14 text-center text-xs"
        min={min}
        max={max}
        fallback={min}
        disabled={disabled}
        value={value}
        onChange={(next) => onChange(next ?? min)}
      />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

type BaselinePaintTableProps = {
  scope: BaselineApplicationScope;
  baselineByKey: Map<string, BaselinePaintSystemInput>;
  primers: CompanyPaintProductRow[];
  topcoats: CompanyPaintProductRow[];
  onUpdate: (
    category: BaselineSurfaceCategory,
    patch: Partial<BaselinePaintSystemInput>,
  ) => void;
};

function BaselinePaintTable({
  scope,
  baselineByKey,
  primers,
  topcoats,
  onUpdate,
}: BaselinePaintTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/70">
      <div className="hidden border-b border-border/60 bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[6.5rem_1fr_1fr] sm:gap-3">
        <span>Surface</span>
        <span>Primer</span>
        <span>Finish (topcoat)</span>
      </div>
      <div className="divide-y divide-border/50">
        {BASELINE_SURFACE_CATEGORIES.map(({ key, label }) => {
          const row =
            baselineByKey.get(baselineRowKey(scope, key)) ??
            emptyBaselineRow(scope, key);

          return (
            <div
              key={key}
              className="grid gap-3 px-3 py-3 sm:grid-cols-[6.5rem_1fr_1fr] sm:items-start sm:gap-3"
            >
              <p className="pt-1.5 text-sm font-medium">{label}</p>

              <div className="space-y-2 rounded-md border border-border/40 bg-background/50 p-2.5">
                <ProductSelect
                  value={row.primer_product_id}
                  options={primers}
                  onValueChange={(primer_product_id) =>
                    onUpdate(key, { primer_product_id })
                  }
                />
                <CoatStepper
                  label="coats"
                  value={row.primer_coats}
                  min={0}
                  max={5}
                  disabled={!row.primer_product_id}
                  onChange={(primer_coats) => onUpdate(key, { primer_coats })}
                />
              </div>

              <div className="space-y-2 rounded-md border border-border/40 bg-background/50 p-2.5">
                <ProductSelect
                  value={row.topcoat_product_id}
                  options={topcoats}
                  onValueChange={(topcoat_product_id) =>
                    onUpdate(key, { topcoat_product_id })
                  }
                />
                <CoatStepper
                  label="coats"
                  value={row.topcoat_coats}
                  min={1}
                  max={5}
                  onChange={(topcoat_coats) =>
                    onUpdate(key, { topcoat_coats })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const UPGRADE_TIER_ACCENT: Record<
  (typeof ESTIMATE_UPGRADE_TIERS)[number],
  string
> = {
  better: "border-primary/25 bg-primary/5",
  best: "border-primary/40 bg-primary/10",
};

function productLabel(
  productId: string | null | undefined,
  productsById: Map<string, CompanyPaintProductRow>,
  fallback = "Not set",
): string {
  if (!productId) return fallback;
  return productsById.get(productId)?.name ?? fallback;
}

type GoodBaselineSummaryProps = {
  scope: BaselineApplicationScope;
  baselineByKey: Map<string, BaselinePaintSystemInput>;
  productsById: Map<string, CompanyPaintProductRow>;
};

function GoodBaselineSummary({
  scope,
  baselineByKey,
  productsById,
}: GoodBaselineSummaryProps) {
  const wall =
    baselineByKey.get(baselineRowKey(scope, "wall")) ??
    emptyBaselineRow(scope, "wall");
  const primerName = productLabel(wall.primer_product_id, productsById, "None");
  const topcoatName = productLabel(
    wall.topcoat_product_id,
    productsById,
    "Not set",
  );

  return (
    <div className="rounded-lg border border-border/70 bg-muted/15 p-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">
            {QUOTE_TIER_LABELS.good} — your baseline package
          </h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {ESTIMATE_TIER_SETUP_DESCRIPTIONS.good}
          </p>
        </div>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-md border border-border/50 bg-background/40 px-3 py-2.5">
            <dt className="font-medium text-muted-foreground">Primer</dt>
            <dd className="mt-1 font-medium text-foreground">
              {primerName}
              {wall.primer_product_id ? (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  · {wall.primer_coats} coat{wall.primer_coats === 1 ? "" : "s"}
                </span>
              ) : null}
            </dd>
          </div>
          <div className="rounded-md border border-border/50 bg-background/40 px-3 py-2.5">
            <dt className="font-medium text-muted-foreground">Finish (topcoat)</dt>
            <dd className="mt-1 font-medium text-foreground">
              {topcoatName}
              {wall.topcoat_product_id ? (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  · {wall.topcoat_coats} coat
                  {wall.topcoat_coats === 1 ? "" : "s"}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

type TierPackagesTableProps = {
  scope: BaselineApplicationScope;
  tierDefaultsByScope: CompanyEstimateDefaults["tierDefaultsByScope"];
  productsById: Map<string, CompanyPaintProductRow>;
  primers: CompanyPaintProductRow[];
  topcoats: CompanyPaintProductRow[];
  onUpdate: (
    tier: TierPaintConfigInput["tier"],
    patch: Partial<TierPaintConfigInput>,
  ) => void;
};

function TierPackagesTable({
  scope,
  tierDefaultsByScope,
  productsById,
  primers,
  topcoats,
  onUpdate,
}: TierPackagesTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full min-w-[480px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              Package setting
            </th>
            {ESTIMATE_UPGRADE_TIERS.map((tier) => (
              <th
                key={tier}
                className={cn(
                  "px-3 py-2.5 text-left font-semibold text-foreground",
                  UPGRADE_TIER_ACCENT[tier],
                )}
              >
                <span className="block">{QUOTE_TIER_LABELS[tier]}</span>
                <span className="mt-1 block text-[10px] font-normal leading-snug text-muted-foreground">
                  {ESTIMATE_TIER_SETUP_DESCRIPTIONS[tier]}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          <tr>
            <td className="px-3 py-3 align-top font-medium text-muted-foreground">
              Primer
            </td>
            {ESTIMATE_UPGRADE_TIERS.map((tier) => {
              const config = tierDefaultsByScope[scope][tier];
              const resolved = resolveTierPaintConfig(config, productsById);
              const selfPriming = resolved.topcoat?.is_self_priming;

              return (
                <td
                  key={tier}
                  className={cn("px-3 py-3 align-top", UPGRADE_TIER_ACCENT[tier])}
                >
                  {selfPriming ? (
                    <p className="text-muted-foreground">
                      Not needed — self-priming finish
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <ProductSelect
                        value={config.primer_product_id}
                        options={primers}
                        placeholder="None"
                        onValueChange={(primer_product_id) =>
                          onUpdate(tier, { primer_product_id })
                        }
                      />
                      <CoatStepper
                        label="coats"
                        value={config.primer_coats}
                        min={1}
                        max={5}
                        onChange={(primer_coats) =>
                          onUpdate(tier, { primer_coats })
                        }
                      />
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="px-3 py-3 align-top font-medium text-muted-foreground">
              Finish (topcoat)
            </td>
            {ESTIMATE_UPGRADE_TIERS.map((tier) => {
              const config = tierDefaultsByScope[scope][tier];
              return (
                <td
                  key={tier}
                  className={cn("px-3 py-3 align-top", UPGRADE_TIER_ACCENT[tier])}
                >
                  <div className="space-y-2">
                    <ProductSelect
                      value={config.topcoat_product_id}
                      options={topcoats}
                      placeholder="None"
                      onValueChange={(topcoat_product_id) =>
                        onUpdate(tier, { topcoat_product_id })
                      }
                    />
                    <CoatStepper
                      label="coats"
                      value={config.topcoat_coats}
                      min={1}
                      max={5}
                      onChange={(topcoat_coats) =>
                        onUpdate(tier, { topcoat_coats })
                      }
                    />
                  </div>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="px-3 py-3 align-top font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                Extra labor
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Extra labor information"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Added to production hours on top of Good — use for extra
                      prep, detail work, or higher-quality application on
                      upgrade packages.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
            </td>
            {ESTIMATE_UPGRADE_TIERS.map((tier) => {
              const config = tierDefaultsByScope[scope][tier];
              return (
                <td
                  key={tier}
                  className={cn("px-3 py-3 align-top", UPGRADE_TIER_ACCENT[tier])}
                >
                  <div className="flex items-center gap-1.5">
                    <EstimateDefaultsNumberInput
                      className="h-8 w-16 text-center"
                      min={0}
                      step={1}
                      value={config.labor_hours_delta_pct}
                      onChange={(labor_hours_delta_pct) =>
                        onUpdate(tier, {
                          labor_hours_delta_pct: labor_hours_delta_pct ?? 0,
                        })
                      }
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SpotPrimeMaterialDefault({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-muted/15 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl space-y-1">
          <h3 className="text-sm font-semibold">Spot prime material default</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Full coat vs. spot prime is chosen per area when you build a quote.
            This default sets how much primer material to count for spot prime —
            as a percentage of what a full coat would use.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <EstimateDefaultsNumberInput
            className="h-9 w-20 text-center"
            min={1}
            max={100}
            step={1}
            fallback={ONBOARDING_DEFAULTS.spotPrimeMaterialPct}
            value={value}
            onChange={(next) =>
              onChange(next ?? ONBOARDING_DEFAULTS.spotPrimeMaterialPct)
            }
          />
          <span className="text-sm text-muted-foreground">% of full coat</span>
        </div>
      </div>
    </section>
  );
}

export type ProductsScopePanelProps = {
  scope: BaselineApplicationScope;
  state: CompanyEstimateDefaults;
  products: CompanyPaintProductRow[];
  onSpotPrimeMaterialPctChange: (value: number) => void;
  onUpdateBaseline: (
    scope: BaselineApplicationScope,
    category: BaselineSurfaceCategory,
    patch: Partial<BaselinePaintSystemInput>,
  ) => void;
  onUpdateTier: (
    scope: BaselineApplicationScope,
    tier: TierPaintConfigInput["tier"],
    patch: Partial<TierPaintConfigInput>,
  ) => void;
};

export function ProductsScopePanel({
  scope,
  state,
  products,
  onSpotPrimeMaterialPctChange,
  onUpdateBaseline,
  onUpdateTier,
}: ProductsScopePanelProps) {
  const scopeLabel = BASELINE_SCOPE_LABELS[scope].toLowerCase();
  const primers = productsForScopeAndRole(products, scope, "primer");
  const topcoats = productsForScopeAndRole(products, scope, "topcoat");
  const productsById = buildProductsMap(products);
  const baselineByKey = new Map(
    state.baselineSystems.map((row) => [
      baselineRowKey(row.application_scope, row.surface_category),
      row,
    ]),
  );

  return (
    <div className="space-y-8">
      <SpotPrimeMaterialDefault
        value={state.spotPrimeMaterialPct}
        onChange={onSpotPrimeMaterialPctChange}
      />

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">
            Default paint by surface
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Starting products for each {scopeLabel} surface when you build a new
            quote. New areas inherit these automatically — you can still change
            them per job.
          </p>
        </div>
        <BaselinePaintTable
          scope={scope}
          baselineByKey={baselineByKey}
          primers={primers}
          topcoats={topcoats}
          onUpdate={(category, patch) =>
            onUpdateBaseline(scope, category, patch)
          }
        />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">
            Customer package options
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Quotes and sell sheets offer Good, Better, and Best tiers on{" "}
            {scopeLabel} jobs.{" "}
            <span className="font-medium text-foreground">Good</span> is always
            your baseline wall system above — configure only the upgrade
            packages here.
          </p>
        </div>
        <GoodBaselineSummary
          scope={scope}
          baselineByKey={baselineByKey}
          productsById={productsById}
        />
        <TierPackagesTable
          scope={scope}
          tierDefaultsByScope={state.tierDefaultsByScope}
          productsById={productsById}
          primers={primers}
          topcoats={topcoats}
          onUpdate={(tier, patch) => onUpdateTier(scope, tier, patch)}
        />
      </section>
    </div>
  );
}
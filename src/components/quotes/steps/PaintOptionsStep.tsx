"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductPickerDrawer } from "@/components/paint-library/ProductPickerDrawer";
import {
  QUOTE_PAINT_TIERS,
  type CompanyPaintPresetRow,
  type CompanyPaintProductRow,
  type TierPaintConfigInput,
} from "@/lib/paint-library/types";
import {
  computeMaterialBreakdown,
  formatGallonsHoursPreview,
} from "@/lib/quotes/estimation/paint-products";
import { resolveTierPaintConfig } from "@/lib/paint-library/types";
import { computeTierAdjustments, buildProductsMap } from "@/lib/quotes/paint-quote-helpers";
import { formatCurrency } from "@/lib/utils";
import type { Company, CompanyPaintProductRole } from "@/types/database";

const TIER_LABELS = {
  good: "Good",
  better: "Better",
  best: "Best",
} as const;

type PaintOptionsStepProps = {
  company: Company;
  paintableSqFt: number;
  tierPaintConfig: Record<string, TierPaintConfigInput>;
  products: CompanyPaintProductRow[];
  presets: CompanyPaintPresetRow[];
  onTierPaintChange: (
    tier: TierPaintConfigInput["tier"],
    patch: Partial<TierPaintConfigInput>,
  ) => void;
  onApplyCompanyDefaults: () => void;
  onApplyPreset: (
    tier: TierPaintConfigInput["tier"],
    presetId: string,
  ) => void;
};

export function PaintOptionsStep({
  company,
  paintableSqFt,
  tierPaintConfig,
  products,
  presets,
  onTierPaintChange,
  onApplyCompanyDefaults,
  onApplyPreset,
}: PaintOptionsStepProps) {
  const [picker, setPicker] = useState<{
    tier: TierPaintConfigInput["tier"];
    role: CompanyPaintProductRole;
  } | null>(null);

  const productsById = useMemo(() => buildProductsMap(products), [products]);
  const tierAdjustments = useMemo(
    () =>
      computeTierAdjustments(
        tierPaintConfig,
        products,
        paintableSqFt,
        company,
      ),
    [tierPaintConfig, products, paintableSqFt, company],
  );

  const hasGoodTopcoat = Boolean(tierPaintConfig.good?.topcoat_product_id);
  const materialMarkup = 0;

  return (
    <div className="space-y-4">
      {!hasGoodTopcoat ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Select primer and paint for accurate material costs and labor hours.
          Legacy quotes use flat $45/gal until configured.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onApplyCompanyDefaults}>
          Use company defaults
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {QUOTE_PAINT_TIERS.map((tier) => {
          const config = tierPaintConfig[tier];
          const resolved = resolveTierPaintConfig(config, productsById);
          const breakdown = computeMaterialBreakdown(
            paintableSqFt,
            resolved,
            company,
            materialMarkup,
          );
          const adjustment = tierAdjustments[tier];
          const selfPriming = resolved.topcoat?.is_self_priming;

          return (
            <Card key={tier}>
              <CardHeader className="pb-3">
                <CardTitle>{TIER_LABELS[tier]}</CardTitle>
                <CardDescription>
                  {presets.length > 0 ? (
                    <Select
                      onValueChange={(presetId) => onApplyPreset(tier, presetId)}
                    >
                      <SelectTrigger className="mt-2 h-8">
                        <SelectValue placeholder="Apply preset…" />
                      </SelectTrigger>
                      <SelectContent>
                        {presets.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    "Pick primer and paint independently"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Primer
                  </Label>
                  {selfPriming ? (
                    <p className="text-sm text-muted-foreground">
                      Not needed (self-priming topcoat)
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() =>
                        setPicker({ tier, role: "primer" })
                      }
                    >
                      {resolved.primer?.name ?? "Select primer…"}
                    </Button>
                  )}
                  {!selfPriming ? (
                    <Input
                      type="number"
                      min={1}
                      className="h-8"
                      value={config.primer_coats}
                      onChange={(e) =>
                        onTierPaintChange(tier, {
                          primer_coats: Number(e.target.value) || 1,
                        })
                      }
                    />
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Paint / Topcoat
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setPicker({ tier, role: "topcoat" })}
                  >
                    {resolved.topcoat?.name ?? "Select paint…"}
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    className="h-8"
                    value={config.topcoat_coats}
                    onChange={(e) =>
                      onTierPaintChange(tier, {
                        topcoat_coats: Number(e.target.value) || 2,
                      })
                    }
                  />
                </div>

                <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                  <p>{formatGallonsHoursPreview(breakdown, company)}</p>
                  <p className="mt-1 font-medium text-foreground">
                    ≈ {formatCurrency(breakdown.paintingLaborCost)} painting labor
                  </p>
                  {tier !== "good" && adjustment ? (
                    <p className="mt-1 text-amber-700 dark:text-amber-300">
                      vs Good:{" "}
                      {adjustment.materialDelta
                        ? `+${formatCurrency(adjustment.materialDelta)} mat`
                        : "$0 mat"}
                      {adjustment.laborDelta
                        ? ` · +${formatCurrency(adjustment.laborDelta)} labor`
                        : ""}
                    </p>
                  ) : null}
                </div>

                {resolved.topcoat || resolved.primer ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Value-add features</Label>
                    <div className="max-h-28 space-y-1 overflow-y-auto text-sm">
                      {[
                        ...(resolved.primer?.paint_system_features ?? []),
                        ...(resolved.topcoat?.paint_system_features ?? []),
                        ...config.value_add_features,
                      ]
                        .filter((v, i, arr) => arr.indexOf(v) === i)
                        .map((feature) => (
                          <label
                            key={feature}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={config.value_add_features.includes(feature)}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...config.value_add_features, feature]
                                  : config.value_add_features.filter(
                                      (f) => f !== feature,
                                    );
                                onTierPaintChange(tier, {
                                  value_add_features: next,
                                });
                              }}
                            />
                            <span>{feature}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {picker ? (
        <ProductPickerDrawer
          open
          role={picker.role}
          companyCoverage={company.coverage_sqft_per_gallon || 350}
          onClose={() => setPicker(null)}
          onSelect={(product) => {
            if (picker.role === "primer") {
              onTierPaintChange(picker.tier, {
                primer_product_id: product.id,
              });
            } else {
              onTierPaintChange(picker.tier, {
                topcoat_product_id: product.id,
              });
            }
            setPicker(null);
          }}
        />
      ) : null}
    </div>
  );
}
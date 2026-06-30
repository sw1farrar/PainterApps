"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  QUOTE_PAINT_TIERS,
  type CompanyPaintProductRow,
  type TierPaintConfigInput,
} from "@/lib/paint-library/types";
import { QUOTE_TIER_LABELS } from "@/lib/quotes/tier-labels";
import type { TierInput } from "@/app/app/(portal)/quotes/actions";
import type { QuotePaintTier } from "@/lib/paint-library/types";
import { cn } from "@/lib/utils";

type SimpleTierSystemsStepProps = {
  paintProducts: CompanyPaintProductRow[];
  tierPaintConfig: Record<QuotePaintTier, TierPaintConfigInput>;
  tierRows: TierInput[];
  baselineTopcoatName: string | null;
  onTierPaintChange: (
    tier: QuotePaintTier,
    patch: Partial<TierPaintConfigInput>,
  ) => void;
  onTierDisplayNameChange: (tier: QuotePaintTier, displayName: string) => void;
};

function productsByRole(
  products: CompanyPaintProductRow[],
  role: "primer" | "topcoat",
): CompanyPaintProductRow[] {
  return products.filter((p) => p.is_active && p.role === role);
}

export function SimpleTierSystemsStep({
  paintProducts,
  tierPaintConfig,
  tierRows,
  baselineTopcoatName,
  onTierPaintChange,
  onTierDisplayNameChange,
}: SimpleTierSystemsStepProps) {
  const primers = useMemo(
    () => productsByRole(paintProducts, "primer"),
    [paintProducts],
  );
  const topcoats = useMemo(
    () => productsByRole(paintProducts, "topcoat"),
    [paintProducts],
  );

  const displayNameValue = (tier: QuotePaintTier) =>
    tierRows.find((r) => r.tier === tier)?.display_name ?? "";

  const displayNameLabel = (tier: QuotePaintTier) => {
    const custom = displayNameValue(tier).trim();
    return custom || QUOTE_TIER_LABELS[tier];
  };

  return (
    <section className="space-y-4 rounded-xl border border-border/50 bg-card/30 p-3 shadow-sm sm:p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Good / Better / Best systems
        </h2>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Good</span> uses your
          wall system topcoat
          {baselineTopcoatName ? ` (${baselineTopcoatName})` : ""}. Configure
          upgraded primer and topcoat for Better and Best, and rename tiers for
          the customer if you like.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {QUOTE_PAINT_TIERS.map((tier) => {
          const config = tierPaintConfig[tier];
          const isGood = tier === "good";
          const displayName = isGood
            ? displayNameLabel(tier)
            : displayNameValue(tier);

          return (
            <div
              key={tier}
              className={cn(
                "space-y-3 rounded-xl border p-3",
                isGood
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/60 bg-background/40",
              )}
            >
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  Customer-facing name
                </Label>
                <Input
                  className="h-8 text-sm font-semibold"
                  value={displayName}
                  disabled={isGood}
                  onChange={(e) =>
                    onTierDisplayNameChange(tier, e.target.value)
                  }
                  placeholder={QUOTE_TIER_LABELS[tier]}
                  title={isGood ? displayNameLabel(tier) : undefined}
                />
              </div>

              {isGood ? (
                <p className="text-xs text-muted-foreground">
                  Matches your wall system. Price on the next step is your Good
                  tier quote.
                </p>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      Primer
                    </Label>
                    <Select
                      value={config.primer_product_id ?? "__none__"}
                      onValueChange={(value) =>
                        onTierPaintChange(tier, {
                          primer_product_id:
                            value === "__none__" ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Not set</SelectItem>
                        {primers.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      Topcoat
                    </Label>
                    <Select
                      value={config.topcoat_product_id ?? "__none__"}
                      onValueChange={(value) =>
                        onTierPaintChange(tier, {
                          topcoat_product_id:
                            value === "__none__" ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Primer coats
                      </Label>
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        min={0}
                        max={5}
                        value={config.primer_coats}
                        onChange={(e) =>
                          onTierPaintChange(tier, {
                            primer_coats: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Topcoat coats
                      </Label>
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        min={1}
                        max={5}
                        value={config.topcoat_coats}
                        onChange={(e) =>
                          onTierPaintChange(tier, {
                            topcoat_coats: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
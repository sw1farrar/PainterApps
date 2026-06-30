"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { TIER_LABELS } from "@/components/quotes/hooks/useQuoteBuilder";
import { QUOTE_PAINT_TIERS } from "@/lib/paint-library/types";
import type { TierInput } from "@/app/app/(portal)/quotes/actions";
import type { QuoteTierName } from "@/types/database";

type TierPricingSectionProps = {
  tierState: Record<QuoteTierName, TierInput>;
  tierBase: number;
  autoTierPrices: Record<QuoteTierName, { price: number; margin: number }>;

  onTierChange: (
    tier: QuoteTierName,
    patch: Partial<TierInput>,
  ) => void;
  onApplyAutoPricing: () => void;
  parseLines: (value: string) => string[];
  joinLines: (values: string[]) => string;
  compact?: boolean;
};

export function TierPricingSection({
  tierState,
  tierBase,
  autoTierPrices,
  onTierChange,
  onApplyAutoPricing,
  parseLines,
  joinLines,
  compact = false,
}: TierPricingSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Tier base (estimated costs with margins):{" "}
          {formatCurrency(tierBase)}
        </p>
        <Button variant="outline" size="sm" onClick={onApplyAutoPricing}>
          Apply auto pricing
        </Button>
      </div>

      <div
        className={
          compact
            ? "grid gap-4 sm:grid-cols-2"
            : "grid gap-4 lg:grid-cols-2"
        }
      >
        {QUOTE_PAINT_TIERS.map((tier) => (
          <Card key={tier}>
            <CardHeader className="pb-3">
              <CardTitle>{TIER_LABELS[tier]}</CardTitle>
              <CardDescription>
                Auto: {formatCurrency(autoTierPrices[tier].price)} ·{" "}
                {autoTierPrices[tier].margin}% margin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={tierState[tier].price}
                    onChange={(e) => {
                      const price = Number(e.target.value);
                      onTierChange(tier, {
                        price,
                        margin:
                          tierBase > 0 && price > 0
                            ? Math.round(
                                ((price - tierBase) / price) * 1000,
                              ) / 10
                            : 0,
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Margin %</Label>
                  <Input
                    type="number"
                    value={tierState[tier].margin}
                    readOnly
                  />
                </div>
              </div>
              {!compact ? (
                <>
                  <div className="space-y-2">
                    <Label>Features (one per line)</Label>
                    <Textarea
                      rows={3}
                      value={joinLines(tierState[tier].features)}
                      onChange={(e) =>
                        onTierChange(tier, {
                          features: parseLines(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Benefits (one per line)</Label>
                    <Textarea
                      rows={3}
                      value={joinLines(tierState[tier].benefits)}
                      onChange={(e) =>
                        onTierChange(tier, {
                          benefits: parseLines(e.target.value),
                        })
                      }
                    />
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
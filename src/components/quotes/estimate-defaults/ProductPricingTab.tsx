"use client";

import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { EstimateDefaultsNumberInput } from "@/components/quotes/estimate-defaults/EstimateDefaultsNumberInput";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LaborCostSection } from "@/components/quotes/estimate-defaults/LaborProductionTab";
import type { CompanyEstimateDefaults } from "@/lib/quotes/company-estimate-defaults";

const TAX_RATE_HELP =
  "In most lump-sum or time-based painting estimates, you do not need to show or add sales tax as a separate charge on the customer's invoice. Sales tax paid on paint and materials is treated as a Cost of Goods Sold (COGS) that you (the contractor) account for when purchasing supplies — it is already built into your pricing. The customer simply pays the quoted total. Always consult your tax attorney or accountant for advice specific to your business, location, and contract style.";

type ProductPricingTabProps = {
  state: CompanyEstimateDefaults;
  onChange: (patch: Partial<CompanyEstimateDefaults>) => void;
};

export function ProductPricingTab({ state, onChange }: ProductPricingTabProps) {
  return (
    <div className="space-y-6">
      <LaborCostSection state={state} onChange={onChange} />

      <section className="space-y-4 rounded-lg border border-border/70 bg-muted/15 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Default margin</h3>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Step 1:</span> Direct
            cost = materials you pay + labor you pay.{" "}
            <span className="font-medium text-foreground">Step 2:</span> Loaded
            cost = direct cost + overhead %.{" "}
            <span className="font-medium text-foreground">Step 3:</span> Selling
            price = loaded cost ÷ (1 − gross profit margin %).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Overhead (% of direct cost)</Label>
            <EstimateDefaultsNumberInput
              min={0}
              value={state.overheadPct}
              onChange={(overheadPct) => onChange({ overheadPct: overheadPct ?? 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Shop burden, sundries, waste, and related costs (default 15%).
            </p>
          </div>
          <div className="space-y-2">
            <Label>Default gross profit margin (%)</Label>
            <EstimateDefaultsNumberInput
              min={0}
              max={99}
              value={state.defaultGrossMarginPct}
              onChange={(defaultGrossMarginPct) =>
                onChange({ defaultGrossMarginPct: defaultGrossMarginPct ?? 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Target margin on loaded cost for new quotes and area bids (default
              25%). Adjustable per project on the quote.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Tax rate (%)</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="Tax rate information"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    {TAX_RATE_HELP}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <EstimateDefaultsNumberInput
              value={state.taxRate}
              onChange={(taxRate) => onChange({ taxRate: taxRate ?? 0 })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
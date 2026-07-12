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
            Each work item shows your at-cost materials and labor. Margin is
            gross profit as a percent of the selling price:{" "}
            <span className="font-medium text-foreground">
              selling price = cost ÷ (1 − margin %)
            </span>
            . New work items use this default; you can adjust margin per work
            item in each area.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Default margin (%)</Label>
            <EstimateDefaultsNumberInput
              min={0}
              value={state.defaultGrossMarginPct}
              onChange={(defaultGrossMarginPct) =>
                onChange({ defaultGrossMarginPct: defaultGrossMarginPct ?? 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Applied to new work items when you build an estimate (default 25%).
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
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LaborProductionSubTabNav } from "@/components/quotes/estimate-defaults/LaborProductionTab";
import { ProductsScopeTabNav } from "@/components/quotes/estimate-defaults/ProductsPackagesTab";
import type { BaselineApplicationScope } from "@/lib/quotes/baseline-paint";
import {
  laborSubTabFromStepId,
  mainTabFromStepId,
  productsScopeFromStepId,
  type EstimateDefaultsMainTab,
  type EstimateDefaultsWizardStep,
  type LaborProductionSubTab,
} from "@/lib/quotes/estimate-defaults-wizard-steps";

type EstimateDefaultsMainTabsProps = {
  currentStep: EstimateDefaultsWizardStep;
  onMainTabChange: (tab: EstimateDefaultsMainTab) => void;
  onLaborSubTabChange: (subTab: LaborProductionSubTab) => void;
  onProductsScopeChange: (scope: BaselineApplicationScope) => void;
};

export function EstimateDefaultsMainTabs({
  currentStep,
  onMainTabChange,
  onLaborSubTabChange,
  onProductsScopeChange,
}: EstimateDefaultsMainTabsProps) {
  const mainTab = mainTabFromStepId(currentStep.id);
  const laborSubTab = laborSubTabFromStepId(currentStep.id);
  const productsScope = productsScopeFromStepId(currentStep.id);

  return (
    <div className="space-y-4">
      <Tabs
        value={mainTab}
        onValueChange={(next) => onMainTabChange(next as EstimateDefaultsMainTab)}
        className="flex w-full justify-center"
      >
        <TabsList className="grid h-11 w-full grid-cols-3">
          <TabsTrigger value="margin" className="text-sm sm:text-base">
            Labor and Margin
          </TabsTrigger>
          <TabsTrigger value="production" className="text-sm sm:text-base">
            Production Rates
          </TabsTrigger>
          <TabsTrigger value="products" className="text-sm sm:text-base">
            Products
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mainTab === "production" ? (
        <LaborProductionSubTabNav
          value={laborSubTab}
          onValueChange={onLaborSubTabChange}
        />
      ) : null}

      {mainTab === "products" && productsScope ? (
        <ProductsScopeTabNav
          value={productsScope}
          onValueChange={onProductsScopeChange}
        />
      ) : null}
    </div>
  );
}
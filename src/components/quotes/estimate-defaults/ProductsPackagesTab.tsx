"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ProductsScopePanel,
  type ProductsScopePanelProps,
} from "@/components/quotes/estimate-defaults/ProductsScopePanel";
import type { BaselineApplicationScope } from "@/lib/quotes/baseline-paint";
import { BASELINE_SCOPE_LABELS } from "@/lib/quotes/baseline-paint";

type ProductsScopeTabNavProps = {
  value: BaselineApplicationScope;
  onValueChange: (value: BaselineApplicationScope) => void;
};

export function ProductsScopeTabNav({
  value,
  onValueChange,
}: ProductsScopeTabNavProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as BaselineApplicationScope)}
    >
      <TabsList className="mx-auto grid h-9 w-full max-w-md grid-cols-2">
        <TabsTrigger value="interior">
          {BASELINE_SCOPE_LABELS.interior}
        </TabsTrigger>
        <TabsTrigger value="exterior">
          {BASELINE_SCOPE_LABELS.exterior}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export type ProductsPackagesTabProps = ProductsScopePanelProps & {
  scope: BaselineApplicationScope;
};

export function ProductsPackagesTab({
  scope,
  ...panelProps
}: ProductsPackagesTabProps) {
  return <ProductsScopePanel scope={scope} {...panelProps} />;
}
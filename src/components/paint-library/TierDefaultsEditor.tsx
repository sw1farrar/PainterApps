"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
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
import {
  fetchCompanyTierDefaults,
  listCompanyPaintProducts,
  saveCompanyTierDefaults,
} from "@/app/app/(portal)/paint-library/actions";
import {
  defaultTierPaintState,
  QUOTE_PAINT_TIERS,
  resolveTierPaintConfig,
  type CompanyPaintProductRow,
  type TierPaintConfigInput,
} from "@/lib/paint-library/types";
import { buildProductsMap } from "@/lib/quotes/paint-quote-helpers";

const TIER_LABELS = {
  good: "Good",
  better: "Better",
  best: "Best",
} as const;

export function TierDefaultsEditor() {
  const [products, setProducts] = useState<CompanyPaintProductRow[]>([]);
  const [tierDefaults, setTierDefaults] = useState<
    Record<string, TierPaintConfigInput>
  >(() => defaultTierPaintState());
  const [isPending, startTransition] = useTransition();

  const productsById = useMemo(() => buildProductsMap(products), [products]);

  const reload = () => {
    startTransition(async () => {
      const [productResult, defaultsResult] = await Promise.all([
        listCompanyPaintProducts(),
        fetchCompanyTierDefaults(),
      ]);
      if (productResult.success) setProducts(productResult.data);
      if (defaultsResult.success) {
        setTierDefaults((prev) => {
          const next = { ...prev };
          for (const config of defaultsResult.data) {
            next[config.tier] = config;
          }
          return next;
        });
      }
    });
  };

  useEffect(() => {
    reload();
  }, []);

  const updateTier = (
    tier: TierPaintConfigInput["tier"],
    patch: Partial<TierPaintConfigInput>,
  ) => {
    setTierDefaults((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], ...patch },
    }));
  };

  const saveDefaults = () => {
    startTransition(async () => {
      const result = await saveCompanyTierDefaults(
        QUOTE_PAINT_TIERS.map((tier) => tierDefaults[tier]),
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Tier defaults saved");
      reload();
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These defaults populate the Paint step when you click &ldquo;Use company
        defaults&rdquo; on a new quote.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {QUOTE_PAINT_TIERS.map((tier) => {
          const config = tierDefaults[tier];
          const resolved = resolveTierPaintConfig(config, productsById);
          const selfPriming = resolved.topcoat?.is_self_priming;

          return (
            <Card key={tier}>
              <CardHeader className="pb-3">
                <CardTitle>{TIER_LABELS[tier]}</CardTitle>
                <CardDescription>Default primer and topcoat</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Primer</Label>
                  {selfPriming ? (
                    <p className="text-sm text-muted-foreground">
                      Not needed (self-priming topcoat)
                    </p>
                  ) : (
                    <Select
                      value={config.primer_product_id ?? "none"}
                      onValueChange={(value) =>
                        updateTier(tier, {
                          primer_product_id: value === "none" ? null : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional primer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {products
                          .filter((product) => product.role === "primer")
                          .map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!selfPriming ? (
                    <Input
                      type="number"
                      min={1}
                      value={config.primer_coats}
                      onChange={(e) =>
                        updateTier(tier, {
                          primer_coats: Number(e.target.value) || 1,
                        })
                      }
                    />
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Topcoat</Label>
                  <Select
                    value={config.topcoat_product_id ?? "none"}
                    onValueChange={(value) =>
                      updateTier(tier, {
                        topcoat_product_id: value === "none" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topcoat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {products
                        .filter((product) => product.role === "topcoat")
                        .map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={config.topcoat_coats}
                    onChange={(e) =>
                      updateTier(tier, {
                        topcoat_coats: Number(e.target.value) || 2,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Button type="button" onClick={saveDefaults} disabled={isPending}>
        {isPending ? "Saving…" : "Save tier defaults"}
      </Button>
    </div>
  );
}
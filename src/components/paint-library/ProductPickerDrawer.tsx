"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { AppDrawer } from "@/components/portal/AppDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  browseCatalogProducts,
  importCatalogProduct,
  listCompanyPaintProducts,
  saveCustomPaintProduct,
  type CatalogProductBrowseRow,
} from "@/app/app/(portal)/paint-library/actions";
import type { CompanyPaintProductRole } from "@/types/database";
import { DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON } from "@/lib/paint-library/coverage";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import { ROLE_LABELS } from "@/lib/paint-library/types";

type ProductPickerDrawerProps = {
  open: boolean;
  onClose: () => void;
  role: CompanyPaintProductRole;
  companyCoverage: number;
  onSelect: (product: CompanyPaintProductRow) => void;
};

export function ProductPickerDrawer({
  open,
  onClose,
  role,
  companyCoverage,
  onSelect,
}: ProductPickerDrawerProps) {
  const [tab, setTab] = useState<"mine" | "catalog" | "custom">("mine");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<CompanyPaintProductRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogProductBrowseRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [customName, setCustomName] = useState("");
  const [customCost, setCustomCost] = useState("45");
  const [customCoverage, setCustomCoverage] = useState(String(companyCoverage));

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const result = await listCompanyPaintProducts();
      if (result.success) setProducts(result.data);
    });
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "catalog") return;
    startTransition(async () => {
      const result = await browseCatalogProducts(query);
      if (result.success) setCatalog(result.data);
    });
  }, [open, tab, query]);

  const filtered = products.filter(
    (p) =>
      p.role === role &&
      (!query.trim() || p.name.toLowerCase().includes(query.toLowerCase())),
  );

  const catalogFiltered = catalog.filter((p) => {
    const catRole =
      p.category === "primer" || p.category === "undercoater"
        ? "primer"
        : p.category === "sealer"
          ? "sealer"
          : "topcoat";
    return catRole === role;
  });

  const handleImport = (item: CatalogProductBrowseRow) => {
    startTransition(async () => {
      const result = await importCatalogProduct({
        paintProductId: item.id,
        unitCost: 45,
        coverageSqftPerGallon:
          item.coverage_sqft_per_gallon ??
          DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
      });
      if (!result.success) return;
      onSelect(result.data);
      onClose();
    });
  };

  const handleSaveCustom = () => {
    startTransition(async () => {
      const result = await saveCustomPaintProduct({
        name: customName,
        role,
        unitCost: Number(customCost) || 0,
        coverageSqftPerGallon:
          Number(customCoverage) || DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
      });
      if (!result.success) return;
      onSelect(result.data);
      onClose();
    });
  };

  return (
    <AppDrawer
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={`Select ${ROLE_LABELS[role]}`}
      description="Choose from your library, global catalog, or add a custom SKU."

    >
      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          {(["mine", "catalog", "custom"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={tab === value ? "default" : "outline"}
              onClick={() => setTab(value)}
            >
              {value === "mine"
                ? "My products"
                : value === "catalog"
                  ? "Catalog"
                  : "Custom"}
            </Button>
          ))}
        </div>

        {tab !== "custom" ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        ) : null}

        {isPending ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {tab === "mine" ? (
          <div className="grid gap-2">
            {filtered.map((product) => (
              <button
                key={product.id}
                type="button"
                className="rounded-lg border border-border p-3 text-left hover:bg-muted/50"
                onClick={() => {
                  onSelect(product);
                  onClose();
                }}
              >
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${product.unit_cost}/gal ·{" "}
                  {product.coverage_sqft_per_gallon ?? companyCoverage} sf/gal
                </p>
              </button>
            ))}
            {!filtered.length && !isPending ? (
              <p className="text-sm text-muted-foreground">
                No {ROLE_LABELS[role].toLowerCase()} products yet. Try Catalog or
                Custom.
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === "catalog" ? (
          <div className="grid gap-2">
            {catalogFiltered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-lg border border-border p-3 text-left hover:bg-muted/50"
                onClick={() => handleImport(item)}
              >
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.manufacturer_name} · {item.category}
                </p>
              </button>
            ))}
          </div>
        ) : null}

        {tab === "custom" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Product name</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cost ($/gal)</Label>
                <Input
                  type="number"
                  value={customCost}
                  onChange={(e) => setCustomCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Coverage (sf/gal)</Label>
                <Input
                  type="number"
                  value={customCoverage}
                  onChange={(e) => setCustomCoverage(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              disabled={!customName.trim()}
              onClick={handleSaveCustom}
            >
              Save & select
            </Button>
          </div>
        ) : null}
      </div>
    </AppDrawer>
  );
}
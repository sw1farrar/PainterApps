"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deactivatePaintPreset,
  deactivatePaintProduct,
  listCompanyPaintProducts,
  listPaintPresets,
  savePaintPreset,
} from "@/app/app/(portal)/paint-library/actions";
import { ProductEditDialog } from "@/components/paint-library/ProductEditDialog";
import { RemoveCatalogProductDialog } from "@/components/products/RemoveCatalogProductDialog";
import { ProductPickerDrawer } from "@/components/paint-library/ProductPickerDrawer";
import { TierDefaultsEditor } from "@/components/paint-library/TierDefaultsEditor";
import type { CompanyPaintProductRow, CompanyPaintPresetRow } from "@/lib/paint-library/types";
import { ROLE_LABELS } from "@/lib/paint-library/types";
import type { Company, CompanyPaintProductRole } from "@/types/database";

type PaintLibrarySettingsProps = {
  company: Company;
};

export function PaintLibrarySettings({ company }: PaintLibrarySettingsProps) {
  const [products, setProducts] = useState<CompanyPaintProductRow[]>([]);
  const [presets, setPresets] = useState<CompanyPaintPresetRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [pickerRole, setPickerRole] = useState<CompanyPaintProductRole | null>(
    null,
  );
  const [editingProduct, setEditingProduct] =
    useState<CompanyPaintProductRow | null>(null);
  const [productToRemove, setProductToRemove] =
    useState<CompanyPaintProductRow | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetPrimerId, setPresetPrimerId] = useState<string>("");
  const [presetTopcoatId, setPresetTopcoatId] = useState<string>("");

  const reload = () => {
    startTransition(async () => {
      const [p, pr] = await Promise.all([
        listCompanyPaintProducts(),
        listPaintPresets(),
      ]);
      if (p.success) setProducts(p.data);
      if (pr.success) setPresets(pr.data);
    });
  };

  useEffect(() => {
    reload();
  }, []);

  const resetPresetForm = () => {
    setEditingPresetId(null);
    setPresetName("");
    setPresetPrimerId("");
    setPresetTopcoatId("");
  };

  const handleQuickCustom = (role: CompanyPaintProductRole) => {
    setPickerRole(role);
  };

  const startEditPreset = (preset: CompanyPaintPresetRow) => {
    setEditingPresetId(preset.id);
    setPresetName(preset.name);
    setPresetPrimerId(preset.primer_product_id ?? "");
    setPresetTopcoatId(preset.topcoat_product_id ?? "");
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    startTransition(async () => {
      const result = await savePaintPreset({
        id: editingPresetId ?? undefined,
        name: presetName.trim(),
        primerProductId: presetPrimerId || null,
        topcoatProductId: presetTopcoatId || null,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editingPresetId ? "Preset updated" : "Preset saved");
      resetPresetForm();
      reload();
    });
  };

  const confirmRemoveProduct = () => {
    if (!productToRemove) return;
    const { id, name } = productToRemove;
    startTransition(async () => {
      const result = await deactivatePaintProduct(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} removed from your library`);
      setProductToRemove(null);
      reload();
    });
  };

  const removePreset = (preset: CompanyPaintPresetRow) => {
    if (!window.confirm(`Remove preset "${preset.name}"?`)) return;
    startTransition(async () => {
      const result = await deactivatePaintPreset(preset.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Preset removed");
      if (editingPresetId === preset.id) resetPresetForm();
      reload();
    });
  };

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Paint library</CardTitle>
        <CardDescription>
          Manage primers, topcoats, and optional Good/Better/Best presets for
          quotes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="products">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="tier-defaults">Tier defaults</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              {(["primer", "topcoat"] as const).map((role) => (
                <Button
                  key={role}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickCustom(role)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add {ROLE_LABELS[role]}
                </Button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ROLE_LABELS[product.role]} · ${product.unit_cost}/gal
                      {product.coverage_sqft_per_gallon
                        ? ` · ${product.coverage_sqft_per_gallon} sq ft/gal`
                        : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={`Edit ${product.name}`}
                      onClick={() => setEditingProduct(product)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label={`Remove ${product.name}`}
                      onClick={() => setProductToRemove(product)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {!products.length && !isPending ? (
                <p className="text-sm text-muted-foreground">
                  No products yet. Add a primer or topcoat to get started.
                </p>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="presets" className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Preset name</Label>
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Standard interior"
                />
              </div>
              <div className="space-y-2">
                <Label>Primer</Label>
                <Select
                  value={presetPrimerId || "none"}
                  onValueChange={(value) =>
                    setPresetPrimerId(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional primer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {products
                      .filter((p) => p.role === "primer")
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topcoat</Label>
                <Select
                  value={presetTopcoatId || "none"}
                  onValueChange={(value) =>
                    setPresetTopcoatId(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select topcoat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {products
                      .filter((p) => p.role === "topcoat")
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={savePreset}
                disabled={!presetName.trim()}
              >
                {editingPresetId ? "Update preset" : "Save preset"}
              </Button>
              {editingPresetId ? (
                <Button type="button" variant="outline" onClick={resetPresetForm}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
            <div className="grid gap-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{preset.name}</p>
                    <p className="text-muted-foreground">
                      Primer + topcoat shortcut for quotes
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={`Edit ${preset.name}`}
                      onClick={() => startEditPreset(preset)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label={`Remove ${preset.name}`}
                      onClick={() => removePreset(preset)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tier-defaults" className="space-y-4 pt-4">
            <TierDefaultsEditor />
          </TabsContent>
        </Tabs>
      </CardContent>

      {pickerRole ? (
        <ProductPickerDrawer
          open
          role={pickerRole}
          companyCoverage={company.coverage_sqft_per_gallon || 350}
          onClose={() => setPickerRole(null)}
          onSelect={() => {
            setPickerRole(null);
            reload();
          }}
        />
      ) : null}

      <ProductEditDialog
        product={editingProduct}
        companyCoverage={company.coverage_sqft_per_gallon || 350}
        onClose={() => setEditingProduct(null)}
        onSaved={reload}
      />

      <RemoveCatalogProductDialog
        open={productToRemove != null}
        productName={productToRemove?.name ?? ""}
        isPending={isPending}
        onOpenChange={(open) => {
          if (!open && !isPending) setProductToRemove(null);
        }}
        onConfirm={confirmRemoveProduct}
      />
    </Card>
  );
}
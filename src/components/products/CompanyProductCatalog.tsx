"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Loader2, Pencil, PenLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deactivatePaintProduct,
  enrichCompanyProductMarketingSheetView,
  getCompanyPaintProduct,
  listCompanyCatalogManufacturers,
  listCompanyPaintCatalog,
  updateCompanyProductUnitCost,
  uploadPlatformPaintProductCanImage,
} from "@/app/app/(portal)/paint-library/actions";
import { CatalogCanImageCell } from "@/components/products/CatalogCanImageCell";
import {
  CatalogUnitCostCell,
  focusCatalogUnitCostInput,
} from "@/components/products/CatalogUnitCostCell";
import { ProductEditDialog } from "@/components/paint-library/ProductEditDialog";
import {
  CatalogFilterToolbar,
  DEFAULT_CATALOG_FILTERS,
  type CatalogFilters,
} from "@/components/products/CatalogFilterToolbar";
import { PlatformProductLookup } from "@/components/products/PlatformProductLookup";
import { ProductMarketingSheetModal } from "@/components/admin/ProductMarketingSheetModal";
import { RemoveCatalogProductDialog } from "@/components/products/RemoveCatalogProductDialog";
import { Button } from "@/components/ui/button";
import {
  formatApplicationType,
  formatResinSystem,
} from "@/lib/product-catalog/product-attribute-display";
import {
  buildCompanyProductMarketingSheetView,
  type ProductMarketingSheetView,
} from "@/lib/product-catalog/product-marketing-sheet";
import type { PaintResinSystem } from "@/lib/product-catalog/types";
import { ROLE_LABELS } from "@/lib/paint-library/types";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";

import { cn } from "@/lib/utils";

type CompanyProductCatalogProps = {
  companyCoverage: number;
  initialProducts: CompanyPaintProductRow[];
  initialManufacturers: string[];
};

function formatResin(product: CompanyPaintProductRow) {
  if (product.resin_type?.trim()) return product.resin_type.trim();
  if (product.resin_system && product.resin_system !== "unknown") {
    return formatResinSystem(product.resin_system as PaintResinSystem);
  }
  return "—";
}

export function CompanyProductCatalog({
  companyCoverage,
  initialProducts,
  initialManufacturers,
}: CompanyProductCatalogProps) {
  const [products, setProducts] = useState(initialProducts);
  const [manufacturers, setManufacturers] = useState(initialManufacturers);
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupMode, setLookupMode] = useState<"platform" | "custom">("platform");
  const [editingProduct, setEditingProduct] =
    useState<CompanyPaintProductRow | null>(null);
  const [productToRemove, setProductToRemove] =
    useState<CompanyPaintProductRow | null>(null);
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);
  const [previewView, setPreviewView] = useState<ProductMarketingSheetView | null>(
    null,
  );
  const [previewEnriching, setPreviewEnriching] = useState(false);
  const previewEnrichCacheRef = useRef(
    new Map<string, ProductMarketingSheetView>(),
  );
  const previewEnrichInflightRef = useRef(
    new Map<string, Promise<ProductMarketingSheetView | null>>(),
  );
  const [editingLoadingId, setEditingLoadingId] = useState<string | null>(null);
  const [savingCostId, setSavingCostId] = useState<string | null>(null);
  const [costDrafts, setCostDrafts] = useState<Record<string, string>>({});
  const unitCostInputRefs = useRef(new Map<string, HTMLInputElement>());
  const [isPending, startTransition] = useTransition();

  const updateFilter = <K extends keyof CatalogFilters>(
    key: K,
    value: CatalogFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_CATALOG_FILTERS);
  };

  const reload = useCallback(() => {
    startTransition(async () => {
      const [productsResult, manufacturersResult] = await Promise.all([
        listCompanyPaintCatalog(),
        listCompanyCatalogManufacturers(),
      ]);

      if (productsResult.success) {
        setProducts(productsResult.data);
        previewEnrichCacheRef.current.clear();
        previewEnrichInflightRef.current.clear();
      } else {
        toast.error(productsResult.error);
      }

      if (manufacturersResult.success) {
        setManufacturers(manufacturersResult.data);
      } else {
        toast.error(manufacturersResult.error);
      }
    });
  }, []);

  useEffect(() => {
    if (initialProducts.length > 0) return;
    reload();
  }, [initialProducts.length, reload]);

  const openEditProduct = (product: CompanyPaintProductRow) => {
    setEditingLoadingId(product.id);
    void getCompanyPaintProduct(product.id).then((result) => {
      setEditingLoadingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setEditingProduct(result.data);
    });
  };

  const filteredProducts = useMemo(() => {
    const search = filters.query.trim().toLowerCase();
    const manufacturerQuery = filters.manufacturer.trim().toLowerCase();

    return products.filter((product) => {
      if (filters.role !== "all" && product.role !== filters.role) return false;
      if (filters.source !== "all" && product.source !== filters.source) {
        return false;
      }
      if (
        filters.applicationType !== "all" &&
        product.application_type !== filters.applicationType
      ) {
        return false;
      }
      if (filters.selfPriming === "yes" && !product.is_self_priming) {
        return false;
      }
      if (filters.selfPriming === "no" && product.is_self_priming) {
        return false;
      }
      if (filters.status === "active" && !product.is_active) return false;
      if (filters.status === "inactive" && product.is_active) return false;
      if (
        manufacturerQuery &&
        !product.manufacturer_name?.toLowerCase().includes(manufacturerQuery)
      ) {
        return false;
      }
      if (!search) return true;
      return (
        product.name.toLowerCase().includes(search) ||
        product.manufacturer_name?.toLowerCase().includes(search) ||
        product.sheen?.toLowerCase().includes(search)
      );
    });
  }, [products, filters]);

  const existingCatalogProductIds = useMemo(
    () =>
      new Set(
        products
          .filter((product) => product.is_active)
          .map((product) => product.paint_product_id)
          .filter((id): id is string => Boolean(id)),
      ),
    [products],
  );

  const enrichPreviewView = useCallback(
    (product: CompanyPaintProductRow) => {
      const cached = previewEnrichCacheRef.current.get(product.id);
      if (cached) return Promise.resolve(cached);

      const inflight = previewEnrichInflightRef.current.get(product.id);
      if (inflight) return inflight;

      const request = enrichCompanyProductMarketingSheetView(product).then(
        (result) => {
          previewEnrichInflightRef.current.delete(product.id);
          if (!result.success) return null;
          previewEnrichCacheRef.current.set(product.id, result.data);
          return result.data;
        },
      );

      previewEnrichInflightRef.current.set(product.id, request);
      return request;
    },
    [],
  );

  const openProductPreview = (product: CompanyPaintProductRow) => {
    const cached = previewEnrichCacheRef.current.get(product.id);
    const instantView =
      cached ?? buildCompanyProductMarketingSheetView(product);

    setPreviewProductId(product.id);
    setPreviewView(instantView);
    setPreviewEnriching(!cached);

    void enrichPreviewView(product).then((enrichedView) => {
      if (!enrichedView) {
        if (!cached) {
          toast.error("Failed to load product details");
          setPreviewProductId(null);
          setPreviewView(null);
        }
        setPreviewEnriching(false);
        return;
      }

      setPreviewView((current) =>
        current?.id === product.id ? enrichedView : current,
      );
      setPreviewEnriching(false);
    });
  };

  const prefetchProductPreview = (product: CompanyPaintProductRow) => {
    if (previewEnrichCacheRef.current.has(product.id)) return;
    void enrichPreviewView(product);
  };

  const closeProductPreview = () => {
    setPreviewProductId(null);
    setPreviewView(null);
    setPreviewEnriching(false);
  };

  const focusUnitCostAtIndex = useCallback((index: number) => {
    const product = filteredProducts[index];
    if (!product) return;
    focusCatalogUnitCostInput(unitCostInputRefs.current.get(product.id));
  }, [filteredProducts]);

  const handleUnitCostDraftChange = useCallback(
    (productId: string, value: string | null) => {
      setCostDrafts((current) => {
        if (value == null) {
          if (!(productId in current)) return current;
          const next = { ...current };
          delete next[productId];
          return next;
        }
        return { ...current, [productId]: value };
      });
    },
    [],
  );

  const handleSaveUnitCost = useCallback(
    async (productId: string, unitCost: number) => {
      setSavingCostId(productId);
      const result = await updateCompanyProductUnitCost(productId, unitCost);
      setSavingCostId(null);

      if (!result.success) {
        toast.error(result.error);
        return false;
      }

      setProducts((current) =>
        current.map((row) => (row.id === productId ? result.data : row)),
      );
      previewEnrichCacheRef.current.delete(productId);
      return true;
    },
    [],
  );

  const confirmRemoveProduct = () => {
    if (!productToRemove) return;
    const { id, name } = productToRemove;
    startTransition(async () => {
      const result = await deactivatePaintProduct(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} removed from catalog`);
      setProductToRemove(null);
      reload();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground lg:hidden">
          {filteredProducts.length} of {products.length} product
          {products.length === 1 ? "" : "s"}
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLookupMode("custom");
              setLookupOpen(true);
            }}
          >
            <PenLine className="mr-2 h-4 w-4" />
            Custom product
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setLookupMode("platform");
              setLookupOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add product
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <CatalogFilterToolbar
          filters={filters}
          onChange={updateFilter}
          onClear={clearFilters}
          filteredCount={filteredProducts.length}
          totalCount={products.length}
          manufacturerOptions={manufacturers}
          manufacturersLoading={isPending}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
        />

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm">
              <tr>
                <th className="w-14 px-2 py-2.5">
                  <span className="sr-only">Can</span>
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">
                  Manufacturer
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">
                  Application
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">
                  Scope
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">
                  Resin
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">
                  Unit cost
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              className={cn(
                "divide-y divide-border bg-card/20",
                isPending && "opacity-60",
              )}
            >
              {isPending && !filteredProducts.length
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      <td className="px-2 py-2.5">
                        <div className="h-12 w-12 animate-pulse rounded bg-muted/40" />
                      </td>
                      <td colSpan={7} className="px-4 py-2.5">
                        <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted/40" />
                      </td>
                    </tr>
                  ))
                : null}
              {filteredProducts.map((product, rowIndex) => {
                return (
                  <tr
                    key={product.id}
                    onClick={() => openProductPreview(product)}
                    onMouseEnter={() => prefetchProductPreview(product)}
                    className={cn(
                      !product.is_active && "opacity-60",
                      "cursor-pointer hover:bg-navy-900/35",
                    )}
                  >
                    <td className="px-2 py-2.5">
                      {product.paint_product_id ? (
                        <CatalogCanImageCell
                          paintProductId={product.paint_product_id}
                          productName={product.name}
                          canImageUrl={product.can_image_url}
                          cacheBuster={
                            product.can_image_updated_at ?? product.updated_at
                          }
                          upload={uploadPlatformPaintProductCanImage}
                          onUploaded={({ canImageUrl, updatedAt }) => {
                            setProducts((current) =>
                              current.map((entry) =>
                                entry.id === product.id
                                  ? {
                                      ...entry,
                                      can_image_url: canImageUrl,
                                      can_image_updated_at: updatedAt,
                                      updated_at: updatedAt,
                                    }
                                  : entry,
                              ),
                            );
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded bg-muted/30" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-white">
                      {product.name}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {product.manufacturer_name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">{ROLE_LABELS[product.role]}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatApplicationType(
                        product.application_type as
                          | "interior"
                          | "exterior"
                          | "both",
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatResin(product)}
                    </td>
                    <td className="px-4 py-2.5">
                      <CatalogUnitCostCell
                        productId={product.id}
                        unitCost={product.unit_cost}
                        isSaving={savingCostId === product.id}
                        inputRef={(element) => {
                          if (element) {
                            unitCostInputRefs.current.set(product.id, element);
                          } else {
                            unitCostInputRefs.current.delete(product.id);
                          }
                        }}
                        onDraftChange={handleUnitCostDraftChange}
                        onSave={handleSaveUnitCost}
                        onTabNext={() => focusUnitCostAtIndex(rowIndex + 1)}
                        onTabPrevious={() => focusUnitCostAtIndex(rowIndex - 1)}
                      />
                    </td>
                    <td
                      className="px-4 py-2.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={`Edit ${product.name}`}
                          disabled={editingLoadingId === product.id}
                          onClick={() => openEditProduct(product)}
                        >
                          {editingLoadingId === product.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Pencil className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        {product.is_active ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={`Remove ${product.name}`}
                            disabled={
                              isPending && productToRemove?.id === product.id
                            }
                            onClick={() => setProductToRemove(product)}
                          >
                            {isPending && productToRemove?.id === product.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filteredProducts.length && !isPending ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              {products.length === 0
                ? "Your catalog is empty. Browse the platform database to add products."
                : "No products match your filters."}
            </div>
          ) : null}
        </div>
      </div>

      <PlatformProductLookup
        open={lookupOpen}
        initialMode={lookupMode}
        onClose={() => setLookupOpen(false)}
        companyCoverage={companyCoverage}
        existingCatalogProductIds={existingCatalogProductIds}
        onImported={(imported) => {
          if (imported) {
            setProducts((current) => {
              const others = current.filter((row) => row.id !== imported.id);
              return [imported, ...others];
            });
          }
          reload();
        }}
      />

      <ProductEditDialog
        product={editingProduct}
        companyCoverage={companyCoverage}
        onClose={() => setEditingProduct(null)}
        onSaved={reload}
      />

      <ProductMarketingSheetModal
        view={previewView}
        downloadHref={
          previewView
            ? `/api/company-paint-products/${previewView.id}/marketing-sheet`
            : null
        }
        isEnriching={previewEnriching}
        open={previewProductId != null}
        onClose={closeProductPreview}
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
    </div>
  );
}
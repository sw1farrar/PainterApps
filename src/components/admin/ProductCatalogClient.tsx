"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ImageIcon,
  ImageOff,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  deletePaintProduct,
  setPaintProductDiscontinued,
  updatePaintProduct,
  uploadPlatformPaintProductCanImage,
  type UpdatePaintProductInput,
} from "@/app/app/admin/product-catalog/actions";
import { CatalogCanImageCell } from "@/components/products/CatalogCanImageCell";
import { ProductEditModal } from "@/components/admin/ProductEditModal";
import { formatApplicationType } from "@/lib/product-catalog/product-attribute-display";
import type {
  CatalogProductRow,
  PaintManufacturerRow,
} from "@/lib/product-catalog/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ProductMarketingSheetModal = dynamic(
  () =>
    import("@/components/admin/ProductMarketingSheetModal").then(
      (mod) => mod.ProductMarketingSheetModal,
    ),
  { ssr: false },
);

type ProductCatalogClientProps = {
  manufacturers: PaintManufacturerRow[];
  products: CatalogProductRow[];
};

function categoryLabel(value: string) {
  if (value === "primer") return "Primer";
  if (value === "sealer") return "Sealer";
  if (value === "undercoater") return "Undercoater";
  return "Paint";
}

function baseLabel(value: string) {
  if (value === "water") return "Water-based";
  if (value === "oil") return "Oil-based";
  return "Unknown";
}

function enrichmentStatusLabel(status: string) {
  if (status === "complete") return "Complete";
  if (status === "partial") return "Partial";
  return "Pending";
}

export function ProductCatalogClient({
  manufacturers,
  products,
}: ProductCatalogClientProps) {
  const router = useRouter();
  const [catalogProducts, setCatalogProducts] =
    React.useState<CatalogProductRow[]>(products);
  const [catalogManufacturerFilter, setCatalogManufacturerFilter] =
    React.useState("");
  const [catalogMissingCanOnly, setCatalogMissingCanOnly] =
    React.useState(false);
  const [catalogPendingReviewOnly, setCatalogPendingReviewOnly] =
    React.useState(false);
  const [editingProduct, setEditingProduct] =
    React.useState<CatalogProductRow | null>(null);
  const [savingProduct, setSavingProduct] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [discontinuedUpdatingId, setDiscontinuedUpdatingId] = React.useState<
    string | null
  >(null);
  const [marketingSheetProduct, setMarketingSheetProduct] =
    React.useState<CatalogProductRow | null>(null);

  React.useEffect(() => {
    setCatalogProducts(products);
  }, [products]);

  const catalogProductsMissingCanCount = React.useMemo(
    () => catalogProducts.filter((product) => !product.can_image_url).length,
    [catalogProducts],
  );

  const catalogPendingReviewCount = React.useMemo(
    () =>
      catalogProducts.filter(
        (product) => product.catalog_review_status === "pending_review",
      ).length,
    [catalogProducts],
  );

  const filteredCatalogProducts = React.useMemo(() => {
    const query = catalogManufacturerFilter.trim().toLowerCase();
    return catalogProducts.filter((product) => {
      if (catalogMissingCanOnly && product.can_image_url) return false;
      if (
        catalogPendingReviewOnly &&
        product.catalog_review_status !== "pending_review"
      ) {
        return false;
      }
      if (!query) return true;
      return product.manufacturer_name.toLowerCase().includes(query);
    });
  }, [
    catalogProducts,
    catalogManufacturerFilter,
    catalogMissingCanOnly,
    catalogPendingReviewOnly,
  ]);

  const catalogFilterActive =
    catalogManufacturerFilter.trim().length > 0 ||
    catalogMissingCanOnly ||
    catalogPendingReviewOnly;

  const busy =
    savingProduct || deletingId != null || discontinuedUpdatingId != null;

  function openProductEditor(product: CatalogProductRow) {
    setEditingProduct(product);
  }

  function handleCloseProductEditor() {
    setEditingProduct(null);
  }

  async function handleSaveProduct(input: UpdatePaintProductInput) {
    setSavingProduct(true);
    const result = await updatePaintProduct(input);
    setSavingProduct(false);

    if (!result.success) {
      toast.error(result.error ?? "Could not save product.");
      return;
    }

    setCatalogProducts((current) =>
      current.map((product) =>
        product.id === result.data!.product.id ? result.data!.product : product,
      ),
    );
    setEditingProduct(null);
    toast.success("Product saved.");
    router.refresh();
  }

  async function handleToggleDiscontinued(
    product: CatalogProductRow,
    isDiscontinued: boolean,
  ) {
    setDiscontinuedUpdatingId(product.id);
    const result = await setPaintProductDiscontinued({
      productId: product.id,
      isDiscontinued,
    });
    setDiscontinuedUpdatingId(null);

    if (!result.success) {
      toast.error(result.error ?? "Could not update product.");
      return;
    }

    setCatalogProducts((current) =>
      current.map((entry) =>
        entry.id === result.data!.product.id ? result.data!.product : entry,
      ),
    );
    router.refresh();
  }

  async function handleDeleteProduct(productId: string) {
    if (
      !window.confirm(
        "Delete this product from the catalog? This cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingId(productId);
    const result = await deletePaintProduct(productId);
    setDeletingId(null);

    if (!result.success) {
      toast.error(result.error ?? "Could not delete product.");
      return;
    }

    setCatalogProducts((current) =>
      current.filter((product) => product.id !== productId),
    );
    toast.success("Product deleted.");
    router.refresh();
  }

  function openMarketingSheet(product: CatalogProductRow) {
    setMarketingSheetProduct(product);
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card/60">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-white">Product catalog</CardTitle>
            <CardDescription>
              Browse, edit, and manage saved paint products.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {catalogProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products in the catalog yet.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full flex-col gap-2 sm:max-w-2xl sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={catalogManufacturerFilter}
                      onChange={(event) =>
                        setCatalogManufacturerFilter(event.target.value)
                      }
                      placeholder="Filter by manufacturer…"
                      className="h-9 pl-9 pr-9"
                      aria-label="Filter products by manufacturer"
                    />
                    {catalogManufacturerFilter ? (
                      <button
                        type="button"
                        onClick={() => setCatalogManufacturerFilter("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-navy-900/40 hover:text-white"
                        aria-label="Clear manufacturer filter"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant={catalogPendingReviewOnly ? "default" : "outline"}
                    className="h-9 shrink-0"
                    onClick={() =>
                      setCatalogPendingReviewOnly((current) => !current)
                    }
                    aria-pressed={catalogPendingReviewOnly}
                  >
                    Subscriber review
                    {catalogPendingReviewCount > 0
                      ? ` (${catalogPendingReviewCount})`
                      : ""}
                  </Button>
                  <Button
                    type="button"
                    variant={catalogMissingCanOnly ? "default" : "outline"}
                    className="h-9 shrink-0"
                    onClick={() => setCatalogMissingCanOnly((current) => !current)}
                    aria-pressed={catalogMissingCanOnly}
                  >
                    {catalogMissingCanOnly ? (
                      <ImageOff className="mr-2 h-4 w-4" />
                    ) : (
                      <ImageIcon className="mr-2 h-4 w-4" />
                    )}
                    No can image
                    {catalogProductsMissingCanCount > 0
                      ? ` (${catalogProductsMissingCanCount})`
                      : ""}
                  </Button>
                </div>
                {catalogFilterActive ? (
                  <p className="text-xs text-muted-foreground sm:text-right">
                    Showing {filteredCatalogProducts.length} of{" "}
                    {catalogProducts.length} product
                    {catalogProducts.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>

              {filteredCatalogProducts.length === 0 ? (
                <p className="rounded-lg border border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                  {catalogMissingCanOnly && !catalogManufacturerFilter.trim()
                    ? "All saved products have a can image."
                    : catalogMissingCanOnly
                      ? "No products without a can image match your filters."
                      : `No products match "${catalogManufacturerFilter.trim()}". Try a different manufacturer name.`}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border/80">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-navy-900/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Can</th>
                        <th className="px-3 py-2">Manufacturer</th>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Int/Ext</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Resin</th>
                        <th className="px-3 py-2">Base</th>
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Disc.</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCatalogProducts.map((product) => (
                        <tr
                          key={product.id}
                          id={`catalog-product-${product.id}`}
                          onClick={() => openMarketingSheet(product)}
                          className={cn(
                            "border-t border-border/60 cursor-pointer hover:bg-navy-900/35",
                            product.is_discontinued &&
                              "bg-navy-900/20 opacity-80",
                          )}
                        >
                          <td className="px-3 py-2">
                            <CatalogCanImageCell
                              paintProductId={product.id}
                              productName={product.name}
                              canImageUrl={product.can_image_url}
                              cacheBuster={product.updated_at}
                              upload={uploadPlatformPaintProductCanImage}
                              onUploaded={({ canImageUrl, updatedAt }) => {
                                setCatalogProducts((current) =>
                                  current.map((entry) =>
                                    entry.id === product.id
                                      ? {
                                          ...entry,
                                          can_image_url: canImageUrl,
                                          updated_at: updatedAt,
                                        }
                                      : entry,
                                  ),
                                );
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            {product.manufacturer_name}
                          </td>
                          <td className="px-3 py-2 text-white">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{product.name}</span>
                              {product.catalog_review_status ===
                              "pending_review" ? (
                                <Badge variant="secondary">
                                  Needs review
                                </Badge>
                              ) : null}
                              {product.catalog_origin === "subscriber" ? (
                                <Badge variant="outline">Subscriber</Badge>
                              ) : null}
                              {product.is_discontinued ? (
                                <Badge variant="outline">Discontinued</Badge>
                              ) : null}
                            </div>
                            {product.paint_system_feature_options.length > 0 ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {product.paint_system_feature_options.length}{" "}
                                coating spec
                                {product.paint_system_feature_options.length ===
                                1
                                  ? ""
                                  : "s"}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary">
                              {formatApplicationType(product.application_type)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline">
                              {categoryLabel(product.category)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            {product.resin_type ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            {baseLabel(product.base_type)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                product.enrichment_status === "complete"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {enrichmentStatusLabel(product.enrichment_status)}
                            </Badge>
                          </td>
                          <td
                            className="px-3 py-2 text-center"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {discontinuedUpdatingId === product.id ? (
                              <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={product.is_discontinued}
                                onChange={(event) =>
                                  void handleToggleDiscontinued(
                                    product,
                                    event.target.checked,
                                  )
                                }
                                disabled={busy || discontinuedUpdatingId != null}
                                aria-label={`Mark ${product.name} as discontinued`}
                                title="Discontinued"
                              />
                            )}
                          </td>
                          <td
                            className="px-3 py-2 text-right"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openProductEditor(product);
                                }}
                                disabled={busy}
                                title="Edit product"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleDeleteProduct(product.id);
                                }}
                                disabled={busy || deletingId === product.id}
                              >
                                {deletingId === product.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ProductEditModal
        product={editingProduct}
        manufacturers={manufacturers}
        open={editingProduct != null}
        loading={savingProduct}
        onClose={handleCloseProductEditor}
        onSave={handleSaveProduct}
      />

      <ProductMarketingSheetModal
        product={marketingSheetProduct}
        open={marketingSheetProduct != null}
        onClose={() => setMarketingSheetProduct(null)}
      />
    </div>
  );
}
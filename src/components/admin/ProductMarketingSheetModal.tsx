"use client";

import * as React from "react";
import { Download, Loader2, X } from "lucide-react";

import { ProductMarketingSheetPreview } from "@/components/admin/ProductMarketingSheetPreview";
import { Button } from "@/components/ui/button";
import {
  buildProductMarketingSheetView,
  productMarketingSheetFilename,
  type ProductMarketingSheetView,
} from "@/lib/product-catalog/product-marketing-sheet";
import type { CatalogProductRow } from "@/lib/product-catalog/types";

type ProductMarketingSheetModalProps = {
  open: boolean;
  onClose: () => void;
  product?: CatalogProductRow | null;
  view?: ProductMarketingSheetView | null;
  downloadHref?: string | null;
  isEnriching?: boolean;
};

export function ProductMarketingSheetModal({
  product = null,
  view: viewProp = null,
  downloadHref: downloadHrefProp = null,
  isEnriching = false,
  open,
  onClose,
}: ProductMarketingSheetModalProps) {
  const builtView = React.useMemo(
    () => (product ? buildProductMarketingSheetView(product) : null),
    [product],
  );
  const view = viewProp ?? builtView;

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !view) return null;

  const filename = productMarketingSheetFilename(view);
  const downloadHref =
    downloadHrefProp ??
    (product ? `/api/admin/product-catalog/${product.id}/marketing-sheet` : null);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-navy-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-marketing-sheet-title"
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-navy-900/90 px-4 py-3 sm:px-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <h2
            id="product-marketing-sheet-title"
            className="truncate font-display text-lg text-white sm:text-xl"
          >
            {view.productName}
          </h2>
          <p className="truncate text-sm text-silver-400">
            {view.manufacturerName} · Product marketing sheet
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {downloadHref ? (
            <a
              href={downloadHref}
              download={filename}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-silver-300 hover:bg-white/10 hover:text-white"
            aria-label="Close marketing sheet"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-hidden"
        onClick={onClose}
      >
        <div className="product-marketing-sheet-preview-stage product-marketing-sheet-preview-stage--modal relative">
          <div onClick={(event) => event.stopPropagation()}>
            <ProductMarketingSheetPreview view={view} />
          </div>
          {isEnriching ? (
            <div
              className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-navy-900/80 px-3 py-1.5 text-xs text-silver-300 shadow-lg backdrop-blur-sm"
              aria-live="polite"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating…
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
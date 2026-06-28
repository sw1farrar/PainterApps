"use client";

import * as React from "react";
import { Download, X } from "lucide-react";

import { ProductMarketingSheetPreview } from "@/components/admin/ProductMarketingSheetPreview";
import { Button } from "@/components/ui/button";
import {
  buildProductMarketingSheetView,
  productMarketingSheetFilename,
} from "@/lib/product-catalog/product-marketing-sheet";
import type { CatalogProductRow } from "@/lib/product-catalog/types";

type ProductMarketingSheetModalProps = {
  product: CatalogProductRow | null;
  open: boolean;
  onClose: () => void;
};

export function ProductMarketingSheetModal({
  product,
  open,
  onClose,
}: ProductMarketingSheetModalProps) {
  const view = React.useMemo(
    () => (product ? buildProductMarketingSheetView(product) : null),
    [product],
  );

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !product || !view) return null;

  const filename = productMarketingSheetFilename(view);
  const downloadHref = `/api/admin/product-catalog/${product.id}/marketing-sheet`;

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
          <a
            href={downloadHref}
            download={filename}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
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
        className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8"
        onClick={onClose}
      >
        <div
          className="mx-auto max-w-[8.75in]"
          onClick={(event) => event.stopPropagation()}
        >
          <ProductMarketingSheetPreview view={view} />
        </div>
      </div>
    </div>
  );
}
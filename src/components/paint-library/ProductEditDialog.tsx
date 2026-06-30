"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { CustomProductAttributesForm } from "@/components/products/CustomProductAttributesForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveCustomPaintProduct } from "@/app/app/(portal)/paint-library/actions";
import {
  createDefaultCustomProductForm,
  customProductFormFromRow,
  customProductFormToSaveInput,
  type CustomProductFormValues,
} from "@/lib/paint-library/custom-product-form";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import { ROLE_LABELS } from "@/lib/paint-library/types";

type ProductEditDialogProps = {
  product: CompanyPaintProductRow | null;
  companyCoverage: number;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductEditDialog({
  product,
  companyCoverage,
  onClose,
  onSaved,
}: ProductEditDialogProps) {
  const [customForm, setCustomForm] = useState<CustomProductFormValues>(() =>
    createDefaultCustomProductForm(companyCoverage),
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!product) return;
    setCustomForm(customProductFormFromRow(product, companyCoverage));
  }, [product, companyCoverage]);

  const handleSave = () => {
    if (!product || !customForm.name.trim()) return;
    startTransition(async () => {
      const result = await saveCustomPaintProduct(
        customProductFormToSaveInput(customForm, companyCoverage, product.id),
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Product updated");
      onSaved();
      onClose();
    });
  };

  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            {product
              ? `${ROLE_LABELS[product.role]} — update your private pricing and preferences. Product details are shared in the site catalog and reviewed by PainterApps admins.`
              : null}
          </DialogDescription>
        </DialogHeader>
        {product ? (
          <CustomProductAttributesForm
            idPrefix="edit-company-product"
            productId={product.id}
            platformPaintProductId={product.paint_product_id}
            values={customForm}
            onChange={setCustomForm}
          />
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || !customForm.name.trim()}
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
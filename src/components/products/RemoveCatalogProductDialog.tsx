"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RemoveCatalogProductDialogProps = {
  open: boolean;
  productName: string;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function RemoveCatalogProductDialog({
  open,
  productName,
  isPending = false,
  onOpenChange,
  onConfirm,
}: RemoveCatalogProductDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 sm:mx-0">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle>Remove from your catalog?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{productName}</span>{" "}
                will be removed from your product catalog and won&apos;t appear when
                building new quotes.
              </p>
              <p>
                Quotes you&apos;ve already created or sent keep their existing line
                items, pricing, and product details — nothing already produced will
                change.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Keep product
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing…
              </>
            ) : (
              "Remove from catalog"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
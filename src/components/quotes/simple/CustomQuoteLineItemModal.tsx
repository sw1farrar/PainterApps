"use client";

import { useEffect, useState } from "react";
import type { LineItemInput } from "@/app/app/(portal)/quotes/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lineItemLineTotal } from "@/lib/quotes/pricing";
import { formatCurrency } from "@/lib/utils";
import type { LineItemType } from "@/types/database";

export type CustomQuoteLineItemDraft = Pick<
  LineItemInput,
  "type" | "description" | "qty" | "unit_cost" | "markup"
>;

type CustomQuoteLineItemModalProps = {
  open: boolean;
  initial?: CustomQuoteLineItemDraft | null;
  defaultMarkupPct?: number;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: CustomQuoteLineItemDraft) => void;
};

const EMPTY_DRAFT: CustomQuoteLineItemDraft = {
  type: "extra",
  description: "",
  qty: 1,
  unit_cost: 0,
  markup: 0,
};

export function CustomQuoteLineItemModal({
  open,
  initial = null,
  defaultMarkupPct = 0,
  onOpenChange,
  onSave,
}: CustomQuoteLineItemModalProps) {
  const [draft, setDraft] = useState<CustomQuoteLineItemDraft>(EMPTY_DRAFT);

  useEffect(() => {
    if (!open) return;
    setDraft(
      initial
        ? { ...initial }
        : { ...EMPTY_DRAFT, markup: defaultMarkupPct },
    );
  }, [open, initial, defaultMarkupPct]);

  const lineTotal = lineItemLineTotal({
    qty: draft.qty,
    unit_cost: draft.unit_cost,
    markup: draft.markup,
  });

  const handleSubmit = () => {
    const trimmed = draft.description.trim();
    if (!trimmed) return;
    onSave({ ...draft, description: trimmed });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit custom line item" : "Add custom line item"}
          </DialogTitle>
          <DialogDescription>
            Add a charge to the quote that is not tied to a specific area.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={draft.type}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  type: value as LineItemType,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="extra">Extra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-line-description">Description</Label>
            <Input
              id="custom-line-description"
              value={draft.description}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="e.g. Travel fee, Equipment rental"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="custom-line-qty">Qty</Label>
              <Input
                id="custom-line-qty"
                type="number"
                min={0}
                step="any"
                value={draft.qty}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    qty: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-line-unit-cost">Unit cost</Label>
              <Input
                id="custom-line-unit-cost"
                type="number"
                min={0}
                step="any"
                value={draft.unit_cost}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    unit_cost: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-line-markup">Margin %</Label>
              <Input
                id="custom-line-markup"
                type="number"
                min={0}
                step="any"
                value={draft.markup}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    markup: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Line total:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatCurrency(lineTotal)}
            </span>
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!draft.description.trim()}
          >
            {initial ? "Save changes" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
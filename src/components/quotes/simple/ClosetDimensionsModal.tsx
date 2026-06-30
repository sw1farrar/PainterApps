"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  closetCeilingSqFt,
  closetInteriorWallSqFt,
  type ClosetDimensions,
} from "@/lib/quotes/area-surface-dimensions";

type ClosetDimensionsModalProps = {
  open: boolean;
  initial?: ClosetDimensions | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dims: ClosetDimensions) => void;
  onCancel: () => void;
};

export function ClosetDimensionsModal({
  open,
  initial,
  onOpenChange,
  onConfirm,
  onCancel,
}: ClosetDimensionsModalProps) {
  const [lengthFt, setLengthFt] = useState("");
  const [widthFt, setWidthFt] = useState("");
  const [heightFt, setHeightFt] = useState("");

  useEffect(() => {
    if (!open) return;
    setLengthFt(initial?.length_ft ? String(initial.length_ft) : "");
    setWidthFt(initial?.width_ft ? String(initial.width_ft) : "");
    setHeightFt(initial?.height_ft ? String(initial.height_ft) : "8");
  }, [open, initial]);

  const dims: ClosetDimensions = {
    length_ft: Number(lengthFt) || 0,
    width_ft: Number(widthFt) || 0,
    height_ft: Number(heightFt) || 0,
  };
  const wallSqFt = closetInteriorWallSqFt(dims);
  const ceilingSqFt = closetCeilingSqFt(dims);
  const valid = dims.length_ft > 0 && dims.width_ft > 0 && dims.height_ft > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Closet size</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Enter inside dimensions. We estimate paintable wall area inside the
          closet.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Length (ft)</Label>
            <Input
              className="h-9"
              type="number"
              min={0}
              step="0.5"
              value={lengthFt}
              onChange={(e) => setLengthFt(e.target.value)}
              placeholder="3"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Width (ft)</Label>
            <Input
              className="h-9"
              type="number"
              min={0}
              step="0.5"
              value={widthFt}
              onChange={(e) => setWidthFt(e.target.value)}
              placeholder="2"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Height (ft)</Label>
            <Input
              className="h-9"
              type="number"
              min={0}
              step="0.5"
              value={heightFt}
              onChange={(e) => setHeightFt(e.target.value)}
              placeholder="8"
            />
          </div>
        </div>
        {valid ? (
          <p className="text-sm text-muted-foreground">
            Interior walls{" "}
            <span className="font-medium text-foreground">{wallSqFt} sq ft</span>
            {" · "}ceiling{" "}
            <span className="font-medium text-foreground">
              {ceilingSqFt} sq ft
            </span>
          </p>
        ) : null}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!valid}
            onClick={() => {
              onConfirm(dims);
              onOpenChange(false);
            }}
          >
            Add closet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
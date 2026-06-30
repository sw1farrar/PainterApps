"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AreaDeleteConfirmProps = {
  open: boolean;
  areaName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function AreaDeleteConfirm({
  open,
  areaName,
  onOpenChange,
  onConfirm,
}: AreaDeleteConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 sm:mx-0">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle>Remove this area?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{areaName}</span> will
            be removed from the quote, including its dimensions, scope, and
            pricing. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Keep area
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Remove area
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
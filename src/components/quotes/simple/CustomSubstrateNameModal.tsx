"use client";

import { useEffect, useState } from "react";
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

type CustomSubstrateNameModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string) => void;
};

export function CustomSubstrateNameModal({
  open,
  onOpenChange,
  onAdd,
}: CustomSubstrateNameModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-md">
        <DialogHeader>
          <DialogTitle>Custom work item</DialogTitle>
          <DialogDescription>
            Name a one-off substrate for this area — accent wall, built-ins,
            specialty prep, and similar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="custom-substrate-name-input">Name</Label>
          <Input
            id="custom-substrate-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Accent wall, Built-in bookcase"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!name.trim()}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
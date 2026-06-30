"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type QuoteUnsavedPromptProps = {
  open: boolean;
  isSaving?: boolean;
  title?: string;
  description?: string;
  saveLabel?: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
  onSaveAndClose: () => void;
};

export function QuoteUnsavedPrompt({
  open,
  isSaving = false,
  title = "Save your estimate?",
  description = "You have unsaved changes. Save before closing, or discard them.",
  saveLabel = "Save & close",
  onKeepEditing,
  onDiscard,
  onSaveAndClose,
}: QuoteUnsavedPromptProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onKeepEditing()}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onKeepEditing}
            disabled={isSaving}
          >
            Keep editing
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
          >
            Discard
          </Button>
          <Button type="button" onClick={onSaveAndClose} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              saveLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
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
import type { QuoteStatus } from "@/types/database";

type DeleteQuoteDialogProps = {
  open: boolean;
  title: string;
  customerName: string | null;
  areaSummary: string;
  productSummary: string;
  status: QuoteStatus;
  hasLinkedJob: boolean;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteQuoteDialog({
  open,
  title,
  customerName,
  areaSummary,
  productSummary,
  status,
  hasLinkedJob,
  isPending = false,
  onOpenChange,
  onConfirm,
}: DeleteQuoteDialogProps) {
  const isSentOrAccepted = status === "sent" || status === "accepted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 sm:mx-0">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle>Delete this estimate?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{title}</span>
                {customerName ? (
                  <>
                    {" "}
                    for{" "}
                    <span className="font-medium text-foreground">
                      {customerName}
                    </span>
                  </>
                ) : null}{" "}
                will be permanently removed.
              </p>

              <dl className="space-y-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs">
                <div>
                  <dt className="font-medium text-muted-foreground">Areas</dt>
                  <dd className="mt-0.5 text-foreground">{areaSummary}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Products</dt>
                  <dd className="mt-0.5 text-foreground">{productSummary}</dd>
                </div>
              </dl>

              {hasLinkedJob ? (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-100">
                  This estimate is linked to a job. Remove or reassign the job
                  before deleting this estimate.
                </p>
              ) : null}

              {!hasLinkedJob && isSentOrAccepted ? (
                <p>
                  This estimate was already{" "}
                  <span className="font-medium text-foreground">{status}</span>.
                  Deleting it removes the quote record and customer-facing
                  history for this estimate.
                </p>
              ) : null}

              {!hasLinkedJob ? (
                <p>This action can&apos;t be undone.</p>
              ) : null}
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
            Keep estimate
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || hasLinkedJob}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete estimate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
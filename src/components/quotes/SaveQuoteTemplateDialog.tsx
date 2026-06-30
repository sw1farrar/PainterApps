"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveQuoteTemplate } from "@/app/app/(portal)/quotes/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { buildTemplatePayload } from "@/lib/quotes/templates/serialize";
import type { QuoteDraftInput } from "@/app/app/(portal)/quotes/actions";
import type { QuoteJobType } from "@/types/database";

type SaveQuoteTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: QuoteDraftInput;
  jobType: QuoteJobType;
  quoteId?: string;
  defaultName?: string;
  onSaved?: () => void;
};

export function SaveQuoteTemplateDialog({
  open,
  onOpenChange,
  draft,
  jobType,
  quoteId,
  defaultName,
  onSaved,
}: SaveQuoteTemplateDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(defaultName ?? "");
  const [description, setDescription] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (next && defaultName && !name) {
      setName(defaultName);
    }
    onOpenChange(next);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter a template name.");
      return;
    }

    startTransition(async () => {
      const result = await saveQuoteTemplate({
        name: trimmed,
        description: description.trim() || null,
        job_type: jobType,
        payload: buildTemplatePayload(draft) as unknown as Record<string, unknown>,
        source_quote_id: quoteId ?? null,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Template saved — use it when starting a new estimate.");
      onOpenChange(false);
      setDescription("");
      onSaved?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
          <DialogDescription>
            Reuse this area layout, line items, and tier setup on future jobs.
            Customer and address are not saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard 3-bed interior"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea
              id="template-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included in this template?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
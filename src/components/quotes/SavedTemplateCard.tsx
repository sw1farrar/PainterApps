"use client";

import { useState, useTransition } from "react";
import { Bookmark, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteQuoteTemplate,
  updateQuoteTemplate,
} from "@/app/app/(portal)/quotes/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { templateAreaCount } from "@/lib/quotes/templates/serialize";
import { cn } from "@/lib/utils";
import type { QuoteTemplate } from "@/types/database";

type SavedTemplateCardProps = {
  template: QuoteTemplate;
  selected: boolean;
  onSelect: () => void;
  onUpdated: (template: QuoteTemplate) => void;
  onDeleted: (templateId: string) => void;
};

export function SavedTemplateCard({
  template,
  selected,
  onSelect,
  onUpdated,
  onDeleted,
}: SavedTemplateCardProps) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");

  const areaCount = templateAreaCount(template);

  const openEdit = () => {
    setName(template.name);
    setDescription(template.description ?? "");
    setEditOpen(true);
  };

  const handleRename = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Template name is required.");
      return;
    }

    startTransition(async () => {
      const result = await updateQuoteTemplate(template.id, {
        name: trimmed,
        description: description.trim() || null,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onUpdated({
        ...template,
        name: trimmed,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      });
      toast.success("Template updated.");
      setEditOpen(false);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteQuoteTemplate(template.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onDeleted(template.id);
      toast.success("Template deleted.");
      setDeleteOpen(false);
    });
  };

  return (
    <>
      <div
        className={cn(
          "relative rounded-xl border text-left transition-colors",
          selected
            ? "border-primary bg-primary/10"
            : "border-border bg-muted/20 hover:border-primary/40",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          className="w-full p-4 pr-12 text-left"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Bookmark className="h-5 w-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground">{template.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {template.description ||
              `Saved template · ${areaCount} area${areaCount === 1 ? "" : "s"}`}
          </p>
          {areaCount > 0 ? (
            <p className="mt-2 text-xs font-medium text-primary">
              {areaCount} areas included
            </p>
          ) : null}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 text-muted-foreground"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Template options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openEdit}>
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename template</DialogTitle>
            <DialogDescription>
              Update the name and description shown on the start screen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-template-name-${template.id}`}>Name</Label>
              <Input
                id={`edit-template-name-${template.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-template-desc-${template.id}`}>
                Description (optional)
              </Label>
              <Textarea
                id={`edit-template-desc-${template.id}`}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleRename} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              &ldquo;{template.name}&rdquo; will be removed. Existing quotes are
              not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
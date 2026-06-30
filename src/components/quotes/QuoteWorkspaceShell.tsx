"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuoteUnsavedPrompt } from "./QuoteUnsavedPrompt";

type QuoteWorkspaceShellProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  isDirty?: boolean;
  isSaving?: boolean;
  showPopOut?: boolean;
  onPopOut?: () => void;
  onClose: () => void;
  onSaveAndClose: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
};

export function QuoteWorkspaceShell({
  open,
  title = "Estimate",
  subtitle,
  isDirty = false,
  isSaving = false,
  showPopOut = true,
  onPopOut,
  onClose,
  onSaveAndClose,
  children,
  className,
}: QuoteWorkspaceShellProps) {
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false);

  const requestClose = useCallback(() => {
    if (isSaving) return;
    if (isDirty) {
      setUnsavedPromptOpen(true);
      return;
    }
    onClose();
  }, [isDirty, isSaving, onClose]);

  useEffect(() => {
    if (!open) {
      setUnsavedPromptOpen(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (unsavedPromptOpen) {
        setUnsavedPromptOpen(false);
        return;
      }
      requestClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, requestClose, unsavedPromptOpen]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const handleSaveAndClose = async () => {
    await onSaveAndClose();
    setUnsavedPromptOpen(false);
    onClose();
  };

  const handleDiscard = () => {
    setUnsavedPromptOpen(false);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-1 backdrop-blur-sm sm:p-2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-workspace-title"
        onClick={requestClose}
      >
        <div
          className={cn(
            "relative flex h-[98dvh] w-[calc(100vw-1rem)] max-w-[1800px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl sm:rounded-xl",
            className,
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <h2
                id="quote-workspace-title"
                className="truncate font-display text-lg text-foreground sm:text-xl"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="truncate text-sm text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
              {isDirty ? (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Unsaved changes
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {showPopOut && onPopOut ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={onPopOut}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pop out</span>
                </Button>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close estimate"
                onClick={requestClose}
                disabled={isSaving}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>

      <QuoteUnsavedPrompt
        open={unsavedPromptOpen}
        isSaving={isSaving}
        onKeepEditing={() => setUnsavedPromptOpen(false)}
        onDiscard={handleDiscard}
        onSaveAndClose={handleSaveAndClose}
      />
    </>
  );
}
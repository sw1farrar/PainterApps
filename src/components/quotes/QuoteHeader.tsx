"use client";

import {
  ArrowLeft,
  Command,
  Compass,
  ExternalLink,
  Eye,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AutosaveStatus } from "./hooks/useQuoteAutosave";
import type { QuoteEditorMode } from "@/lib/quotes/editor-mode";
import type { QuoteJobType, QuoteStatus } from "@/types/database";

const JOB_TYPE_LABELS: Record<QuoteJobType, string> = {
  interior: "Interior",
  exterior: "Exterior",
  both: "Interior + Exterior",
  specialty: "Specialty",
};

type QuoteHeaderProps = {
  quoteName: string;
  onQuoteNameChange: (name: string) => void;
  customerName?: string;
  jobType: QuoteJobType;
  status: QuoteStatus;
  editorMode: QuoteEditorMode;
  onEditorModeChange: (mode: QuoteEditorMode) => void;
  onOpenCommandPalette?: () => void;
  onOpenPreview?: () => void;
  onEditJobDetails?: () => void;
  onSaveDraft?: () => void;
  onExit?: () => void;
  onPopOut?: () => void;
  showExit?: boolean;
  autosaveStatus?: AutosaveStatus;
  lastSavedAt?: Date | null;
  className?: string;
  /** When false, header sits in the editor chrome instead of sticking on scroll. */
  sticky?: boolean;
};

const AUTOSAVE_LABELS: Record<AutosaveStatus, string | null> = {
  idle: null,
  pending: "Unsaved changes",
  saving: "Saving…",
  saved: "All changes saved",
  error: "Save failed",
};

function customerInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function QuoteHeader({
  quoteName,
  onQuoteNameChange,
  customerName,
  jobType,
  status,
  editorMode,
  onEditorModeChange,
  onOpenCommandPalette,
  onOpenPreview,
  onEditJobDetails,
  onSaveDraft,
  onExit,
  onPopOut,
  showExit = true,
  autosaveStatus,
  lastSavedAt,
  className,
  sticky = true,
}: QuoteHeaderProps) {
  const autosaveLabel = autosaveStatus
    ? autosaveStatus === "saved" && lastSavedAt
      ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
      : AUTOSAVE_LABELS[autosaveStatus]
    : null;
  return (
    <div
      className={cn(
        sticky
          ? "sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6"
          : "border-b border-border/60 pb-3",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
          !sticky && "gap-2",
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {showExit && onExit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-0.5 shrink-0"
              aria-label="Back to quotes"
              onClick={onExit}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : null}
          {customerName ? (
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                {customerInitials(customerName)}
              </AvatarFallback>
            </Avatar>
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            <Input
              value={quoteName}
              onChange={(e) => onQuoteNameChange(e.target.value)}
              placeholder={customerName ? `${customerName} estimate` : "Job name"}
              aria-label="Quote name"
              className="h-auto border-0 bg-transparent p-0 font-display text-xl text-white shadow-none focus-visible:ring-2 focus-visible:ring-ring sm:text-2xl"
            />
            <div className="flex flex-wrap items-center gap-2">
              {customerName ? (
                <span className="text-sm text-muted-foreground">
                  {customerName}
                </span>
              ) : null}
              <Badge variant="outline">{JOB_TYPE_LABELS[jobType]}</Badge>
              {status === "draft" && autosaveLabel ? (
                <Badge
                  variant={
                    autosaveStatus === "error"
                      ? "destructive"
                      : autosaveStatus === "saving" || autosaveStatus === "pending"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-xs"
                >
                  {autosaveLabel}
                </Badge>
              ) : null}
              {status !== "draft" ? (
                <Badge
                  variant={status === "accepted" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {status}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onEditJobDetails ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onEditJobDetails}
            >
              Job details
            </Button>
          ) : null}
          {onPopOut ? (
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
          {onOpenPreview ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={onOpenPreview}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
          ) : null}
          {status === "draft" && onSaveDraft ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onSaveDraft}
            >
              Save draft
            </Button>
          ) : null}
          {editorMode === "power" && onOpenCommandPalette ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={onOpenCommandPalette}
            >
              <Command className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Commands</span>
              <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                ⌘K
              </kbd>
            </Button>
          ) : null}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <Button
            type="button"
            size="sm"
            variant={editorMode === "guided" ? "default" : "ghost"}
            className="gap-1.5"
            aria-pressed={editorMode === "guided"}
            onClick={() => onEditorModeChange("guided")}
          >
            <Compass className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Guided</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editorMode === "power" ? "default" : "ghost"}
            className="gap-1.5"
            aria-pressed={editorMode === "power"}
            onClick={() => onEditorModeChange("power")}
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Power</span>
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
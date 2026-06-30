"use client";

import {
  BookmarkPlus,
  Compass,
  Copy,
  Eye,
  LayoutGrid,
  List,
  Paintbrush,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { COMMON_AREAS } from "@/lib/quotes/area-helpers";
import type { QuoteEditorMode } from "@/lib/quotes/editor-mode";
import {
  getVisibleSteps,
  QUOTE_STEPS,
  QUOTE_STEP_META,
  type QuoteStep,
} from "./hooks/useQuoteBuilder";
import { shortcutLabel } from "./hooks/useQuoteKeyboardShortcuts";

type QuoteCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStep: QuoteStep;
  editorMode: QuoteEditorMode;
  maxReachedIndex: number;
  onGoToStep: (step: QuoteStep) => void;
  onAddArea: (name: string) => void;
  onDuplicateArea: () => void;
  onRegenerateAll: () => void;
  onSave: () => void;
  onNext: () => void;
  onOpenPreview: () => void;
  onSaveAsTemplate?: () => void;
  onEditorModeChange: (mode: QuoteEditorMode) => void;
  onApplyPaintDefaults?: () => void;
  onOpenPaintLibrary?: () => void;
};

export function QuoteCommandPalette({
  open,
  onOpenChange,
  currentStep,
  editorMode,
  maxReachedIndex,
  onGoToStep,
  onAddArea,
  onDuplicateArea,
  onRegenerateAll,
  onSave,
  onNext,
  onOpenPreview,
  onSaveAsTemplate,
  onEditorModeChange,
  onApplyPaintDefaults,
  onOpenPaintLibrary,
}: QuoteCommandPaletteProps) {
  const run = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const visibleSteps = getVisibleSteps(editorMode);
  const visibleMeta = QUOTE_STEP_META.filter((meta) =>
    visibleSteps.includes(meta.id),
  );

  const canReachStep = (step: QuoteStep) => {
    const index = QUOTE_STEPS.indexOf(step);
    return editorMode === "power" || index <= maxReachedIndex;
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search actions…" />
      <CommandList>
        <CommandEmpty>No matching actions.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {visibleMeta.map((meta) => (
            <CommandItem
              key={meta.id}
              value={`go ${meta.label} ${meta.short}`}
              disabled={!canReachStep(meta.id)}
              onSelect={() => run(() => onGoToStep(meta.id))}
            >
              <LayoutGrid className="h-4 w-4" />
              Go to {meta.label}
              {currentStep === meta.id ? (
                <CommandShortcut>current</CommandShortcut>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Areas">
          {COMMON_AREAS.map((name) => (
            <CommandItem
              key={name}
              value={`add area ${name}`}
              onSelect={() => run(() => onAddArea(name))}
            >
              <Plus className="h-4 w-4" />
              Add {name}
            </CommandItem>
          ))}
          <CommandItem
            value="duplicate area"
            onSelect={() => run(onDuplicateArea)}
          >
            <Copy className="h-4 w-4" />
            Duplicate selected area
            <CommandShortcut>D</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="regenerate all line items"
            onSelect={() => run(onRegenerateAll)}
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate all line items
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Paint">
          <CommandItem
            value="go paint options"
            disabled={!canReachStep("paint-options")}
            onSelect={() => run(() => onGoToStep("paint-options"))}
          >
            <Paintbrush className="h-4 w-4" />
            Go to Paint
          </CommandItem>
          {onApplyPaintDefaults ? (
            <CommandItem
              value="apply company paint defaults"
              onSelect={() => run(onApplyPaintDefaults)}
            >
              <RefreshCw className="h-4 w-4" />
              Apply company paint defaults
            </CommandItem>
          ) : null}
          {onOpenPaintLibrary ? (
            <CommandItem
              value="open paint library settings"
              onSelect={() => run(onOpenPaintLibrary)}
            >
              <Paintbrush className="h-4 w-4" />
              Open paint library settings
            </CommandItem>
          ) : null}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quote">
          <CommandItem value="save draft" onSelect={() => run(onSave)}>
            <Save className="h-4 w-4" />
            Save draft
            <CommandShortcut>{shortcutLabel("Mod+S")}</CommandShortcut>
          </CommandItem>
          <CommandItem value="next step save continue" onSelect={() => run(onNext)}>
            <Send className="h-4 w-4" />
            {editorMode === "guided" ? "Next" : "Save & continue"}
            <CommandShortcut>{shortcutLabel("Mod+↵")}</CommandShortcut>
          </CommandItem>
          <CommandItem value="customer preview" onSelect={() => run(onOpenPreview)}>
            <Eye className="h-4 w-4" />
            Customer preview
          </CommandItem>
          {onSaveAsTemplate ? (
            <CommandItem
              value="save as template"
              onSelect={() => run(onSaveAsTemplate)}
            >
              <BookmarkPlus className="h-4 w-4" />
              Save as template
            </CommandItem>
          ) : null}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Editor">
          {editorMode === "guided" ? (
            <CommandItem
              value="switch power mode"
              onSelect={() => run(() => onEditorModeChange("power"))}
            >
              <Zap className="h-4 w-4" />
              Switch to Power mode
            </CommandItem>
          ) : (
            <CommandItem
              value="switch guided mode"
              onSelect={() => run(() => onEditorModeChange("guided"))}
            >
              <Compass className="h-4 w-4" />
              Switch to Guided mode
            </CommandItem>
          )}
          {editorMode === "power" ? (
            <CommandItem
              value="line items view"
              disabled={!canReachStep("line-items")}
              onSelect={() => run(() => onGoToStep("line-items"))}
            >
              <List className="h-4 w-4" />
              Review all line items
            </CommandItem>
          ) : null}
          <CommandItem
            value="polish tiers preview"
            disabled={!canReachStep("polish")}
            onSelect={() => run(() => onGoToStep("polish"))}
          >
            <Sparkles className="h-4 w-4" />
            Open polish &amp; preview
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
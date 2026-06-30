"use client";

import { useEffect } from "react";
import type { QuoteEditorMode } from "@/lib/quotes/editor-mode";
import type { QuoteStep } from "./useQuoteBuilder";

type UseQuoteKeyboardShortcutsOptions = {
  enabled: boolean;
  editorMode: QuoteEditorMode;
  step: QuoteStep;
  onOpenPalette: () => void;
  onSave: () => void;
  onNext: () => void;
  onAddArea?: () => void;
  onDuplicateArea?: () => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function useQuoteKeyboardShortcuts({
  enabled,
  editorMode,
  step,
  onOpenPalette,
  onSave,
  onNext,
  onAddArea,
  onDuplicateArea,
}: UseQuoteKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSave();
        return;
      }

      if (editorMode !== "power") return;

      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenPalette();
        return;
      }

      if (mod && event.key === "Enter") {
        event.preventDefault();
        onNext();
        return;
      }

      if (step !== "estimator") return;

      if (!mod && !event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        onAddArea?.();
        return;
      }

      if (!mod && !event.altKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        onDuplicateArea?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    editorMode,
    step,
    onOpenPalette,
    onSave,
    onNext,
    onAddArea,
    onDuplicateArea,
  ]);
}

export function shortcutLabel(keys: string): string {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  return keys.replace(/Mod/g, isMac ? "⌘" : "Ctrl");
}
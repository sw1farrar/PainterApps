"use client";

import { Compass, Paintbrush, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QuoteEditorMode } from "@/lib/quotes/editor-mode";

export type QuoteOnboardingMode = QuoteEditorMode | "paint";

type QuoteEditorOnboardingProps = {
  mode: QuoteOnboardingMode | null;
  onDismiss: () => void;
};

const COPY: Record<
  QuoteOnboardingMode,
  { title: string; description: string; icon: typeof Compass }
> = {
  guided: {
    title: "Guided mode",
    description:
      "Step-by-step flow with fewer decisions. Areas feed straight into options and polish — use Review in Power mode for a full line-item list.",
    icon: Compass,
  },
  power: {
    title: "Power mode",
    description:
      "Jump between steps, use ⌘K for commands, bulk area actions, and keyboard shortcuts. Best when you know your pricing workflow.",
    icon: Zap,
  },
  paint: {
    title: "Paint & tiers",
    description:
      "Configure Good, Better, and Best independently — pick primer and topcoat per tier, apply company defaults or presets, and preview gallons → labor hours before options pricing.",
    icon: Paintbrush,
  },
};

export function QuoteEditorOnboarding({
  mode,
  onDismiss,
}: QuoteEditorOnboardingProps) {
  if (!mode) return null;

  const content = COPY[mode];
  const Icon = content.icon;

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onDismiss}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
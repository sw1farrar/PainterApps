"use client";

import { Check, ChevronRight, Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getVisibleSteps,
  QUOTE_STEP_META,
  type QuoteStep,
} from "@/components/quotes/hooks/useQuoteBuilder";

type QuoteWizardRailProps = {
  currentStep: QuoteStep;
  maxReachedIndex: number;
  editorMode: "guided" | "power";
  onStepClick: (step: QuoteStep) => void;
  onClose?: () => void;
  onNext?: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
  canGoNext?: boolean;
  isPending?: boolean;
  className?: string;
};

export function QuoteWizardRail({
  currentStep,
  maxReachedIndex,
  editorMode,
  onStepClick,
  onClose,
  onNext,
  onBack,
  canGoBack = false,
  canGoNext = true,
  isPending = false,
  className,
}: QuoteWizardRailProps) {
  const visibleSteps = getVisibleSteps(editorMode);
  const visibleMeta = QUOTE_STEP_META.filter((meta) =>
    visibleSteps.includes(meta.id),
  );
  const currentIndex = visibleMeta.findIndex((s) => s.id === currentStep);

  return (
    <aside
      className={cn(
        "flex h-full w-full min-h-0 flex-col border-r border-border/60 bg-card/95 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Quote wizard</p>
            <p className="text-xs text-muted-foreground">
              Step {currentIndex + 1} of {visibleMeta.length}
            </p>
          </div>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close wizard"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {visibleMeta.map((meta, index) => {
          const stepIndex = visibleSteps.indexOf(meta.id);
          const isActive = meta.id === currentStep;
          const isComplete = index < currentIndex;
          const isReachable =
            editorMode === "power" || stepIndex <= maxReachedIndex;

          return (
            <button
              key={meta.id}
              type="button"
              disabled={!isReachable}
              onClick={() => isReachable && onStepClick(meta.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                isReachable
                  ? "hover:bg-muted/60"
                  : "cursor-not-allowed opacity-40",
                isActive && "bg-primary/10 ring-1 ring-primary/30",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isActive && "bg-primary text-primary-foreground",
                  isComplete &&
                    !isActive &&
                    "bg-primary/15 text-primary",
                  !isActive &&
                    !isComplete &&
                    "border border-border bg-background text-muted-foreground",
                )}
              >
                {isComplete && !isActive ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {meta.label}
                </span>
                {isActive ? (
                  <span className="text-xs text-primary">In progress</span>
                ) : isComplete ? (
                  <span className="text-xs text-muted-foreground">Done</span>
                ) : null}
              </span>
              {isActive ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-border/60 p-4">
        <Button
          type="button"
          className="w-full"
          onClick={onNext}
          disabled={!canGoNext || isPending}
        >
          {isPending ? "Saving…" : "Continue"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onBack}
          disabled={!canGoBack || isPending}
        >
          Back
        </Button>
      </div>
    </aside>
  );
}
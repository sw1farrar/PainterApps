"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getVisibleSteps,
  QUOTE_STEPS,
  QUOTE_STEP_META,
  type QuoteStep,
} from "./hooks/useQuoteBuilder";

type QuoteModalStepRailProps = {
  currentStep: QuoteStep;
  maxReachedIndex: number;
  editorMode: "guided" | "power";
  onStepClick: (step: QuoteStep) => void;
};

export function QuoteModalStepRail({
  currentStep,
  maxReachedIndex,
  editorMode,
  onStepClick,
}: QuoteModalStepRailProps) {
  const visibleSteps = getVisibleSteps(editorMode);
  const visibleMeta = QUOTE_STEP_META.filter((meta) =>
    visibleSteps.includes(meta.id),
  );
  const currentIndex = visibleMeta.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Estimate steps" className="flex flex-col gap-1 py-2">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Steps
      </p>
      {visibleMeta.map((meta, index) => {
        const stepIndex = QUOTE_STEPS.indexOf(meta.id);
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
            aria-label={`${meta.label}${isActive ? " (current)" : isComplete ? " (completed)" : ""}`}
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
              isReachable
                ? "cursor-pointer hover:bg-muted/60"
                : "cursor-not-allowed opacity-40",
              isActive && "bg-primary/10 text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                isActive && "border-primary bg-primary text-primary-foreground",
                isComplete &&
                  !isActive &&
                  "border-primary/50 bg-primary/10 text-primary",
                !isActive &&
                  !isComplete &&
                  "border-border bg-background text-muted-foreground",
              )}
            >
              {isComplete && !isActive ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                index + 1
              )}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block font-medium leading-tight",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {meta.label}
              </span>
              {isActive ? (
                <span className="text-xs text-muted-foreground">
                  Step {currentIndex + 1} of {visibleMeta.length}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
      <p className="mt-4 px-3 text-xs text-muted-foreground">
        {editorMode === "guided" ? "Guided mode" : "Power mode"}
      </p>
    </nav>
  );
}
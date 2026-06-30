"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getVisibleSteps,
  QUOTE_STEPS,
  QUOTE_STEP_META,
  type QuoteStep,
} from "./hooks/useQuoteBuilder";

type QuoteStepperProps = {
  currentStep: QuoteStep;
  maxReachedIndex: number;
  editorMode: "guided" | "power";
  onStepClick: (step: QuoteStep) => void;
  compact?: boolean;
};

export function QuoteStepper({
  currentStep,
  maxReachedIndex,
  editorMode,
  onStepClick,
  compact = false,
}: QuoteStepperProps) {
  const visibleSteps = getVisibleSteps(editorMode);
  const visibleMeta = QUOTE_STEP_META.filter((meta) =>
    visibleSteps.includes(meta.id),
  );
  const currentIndex = visibleMeta.findIndex((s) => s.id === currentStep);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Step {currentIndex + 1}/{visibleMeta.length}:{" "}
          <span className="font-medium text-foreground">
            {visibleMeta[currentIndex]?.label}
          </span>
        </span>
        {!compact ? (
          <span className="hidden sm:inline">
            {editorMode === "guided" ? "Guided" : "Power"} mode
          </span>
        ) : null}
      </div>

      <div className={cn("flex", compact ? "gap-1" : "gap-1.5 sm:gap-2")}>
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
              aria-label={`${meta.label}${isActive ? " (current step)" : isComplete ? " (completed)" : ""}`}
              className={cn(
                "group flex min-w-0 flex-1 flex-col items-center transition-colors",
                compact
                  ? "gap-1 rounded-md px-0.5 py-1"
                  : "gap-1.5 rounded-lg px-1 py-2 sm:px-2",
                isReachable
                  ? "cursor-pointer hover:bg-muted/50"
                  : "cursor-not-allowed opacity-40",
                isActive && "bg-muted/40",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border font-semibold transition-colors",
                  compact
                    ? "h-6 w-6 text-[10px] sm:h-7 sm:w-7 sm:text-xs"
                    : "h-7 w-7 text-xs sm:h-8 sm:w-8",
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
              </div>
              <span
                className={cn(
                  "hidden w-full truncate text-center text-[10px] font-medium sm:block sm:text-xs",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {meta.short}
              </span>
              <div
                className={cn(
                  "h-1 w-full rounded-full sm:hidden",
                  index <= currentIndex ? "bg-primary" : "bg-muted",
                )}
              />
            </button>
          );
        })}
      </div>

      {!compact ? (
        <div className="hidden gap-2 sm:flex">
          {visibleMeta.map((meta, index) => (
            <div
              key={meta.id}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index <= currentIndex ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
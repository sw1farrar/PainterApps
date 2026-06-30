"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SIMPLE_STEP_META,
  type SimpleQuoteStep,
} from "@/lib/quotes/simple-builder";

type SimpleQuoteStepperProps = {
  currentStep: SimpleQuoteStep;
  maxReachedIndex: number;
  onStepClick?: (step: SimpleQuoteStep) => void;
  className?: string;
};

export function SimpleQuoteStepper({
  currentStep,
  maxReachedIndex,
  onStepClick,
  className,
}: SimpleQuoteStepperProps) {
  const currentIndex = SIMPLE_STEP_META.findIndex((s) => s.id === currentStep);

  return (
    <nav
      aria-label="Quote steps"
      className={cn(
        "flex w-full items-stretch gap-1 rounded-xl border border-border/50 bg-muted/20 p-1",
        className,
      )}
    >
      {SIMPLE_STEP_META.map((meta, index) => {
        const isActive = meta.id === currentStep;
        const isComplete = index < currentIndex;
        const isReachable = index <= maxReachedIndex;

        return (
          <button
            key={meta.id}
            type="button"
            disabled={!isReachable || !onStepClick}
            onClick={() => isReachable && onStepClick?.(meta.id)}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 transition-all duration-200 sm:px-3",
              isActive && "bg-primary text-primary-foreground shadow-sm",
              isComplete && !isActive && "bg-card/80 text-foreground",
              !isActive && !isComplete && "text-muted-foreground",
              isReachable && onStepClick && !isActive && "hover:bg-muted/40",
              !isReachable && "cursor-default opacity-45",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                isActive && "bg-primary-foreground/20 text-primary-foreground",
                isComplete && !isActive && "bg-primary/15 text-primary",
                !isActive &&
                  !isComplete &&
                  "border border-border/80 bg-background/60",
              )}
            >
              {isComplete && !isActive ? (
                <Check className="h-3 w-3" strokeWidth={2.5} />
              ) : (
                index + 1
              )}
            </span>
            <span className="min-w-0 text-left">
              <span
                className={cn(
                  "block truncate text-xs font-semibold sm:text-sm",
                  isActive ? "text-primary-foreground" : undefined,
                )}
              >
                {meta.label}
              </span>
              <span
                className={cn(
                  "hidden truncate text-[10px] md:block",
                  isActive
                    ? "text-primary-foreground/75"
                    : "text-muted-foreground",
                )}
              >
                {meta.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
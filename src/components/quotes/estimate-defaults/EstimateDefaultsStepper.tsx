"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EstimateDefaultsWizardStep } from "@/lib/quotes/estimate-defaults-wizard-steps";

type EstimateDefaultsStepperProps = {
  steps: EstimateDefaultsWizardStep[];
  currentIndex: number;
  onStepClick: (index: number) => void;
};

export function EstimateDefaultsStepper({
  steps,
  currentIndex,
  onStepClick,
}: EstimateDefaultsStepperProps) {
  const current = steps[currentIndex];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Step {currentIndex + 1} of {steps.length}:{" "}
          <span className="font-medium text-foreground">{current?.label}</span>
        </span>
      </div>

      <div
        className="flex gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Estimate defaults setup steps"
      >
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;

          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "step" : undefined}
              onClick={() => onStepClick(index)}
              className={cn(
                "flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors hover:bg-muted/50",
                isActive && "bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
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
              <span
                className={cn(
                  "max-w-[5.5rem] truncate text-center text-[10px] font-medium sm:max-w-none sm:text-xs",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
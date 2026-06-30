"use client";

import type { QuoteEditorMode } from "@/lib/quotes/editor-mode";
import { QuoteModalStepRail } from "./QuoteModalStepRail";
import { QuoteStepper } from "./QuoteStepper";
import type { QuoteStep } from "./hooks/useQuoteBuilder";

type QuoteModalLayoutProps = {
  currentStep: QuoteStep;
  maxReachedIndex: number;
  editorMode: QuoteEditorMode;
  onStepClick: (step: QuoteStep) => void;
  children: React.ReactNode;
};

export function QuoteModalLayout({
  currentStep,
  maxReachedIndex,
  editorMode,
  onStepClick,
  children,
}: QuoteModalLayoutProps) {
  return (
    <div className="flex min-h-0 flex-col gap-4 lg:flex-row lg:gap-6">
      <aside className="hidden shrink-0 lg:block lg:w-52 xl:w-56">
        <div className="sticky top-0">
          <QuoteModalStepRail
            currentStep={currentStep}
            maxReachedIndex={maxReachedIndex}
            editorMode={editorMode}
            onStepClick={onStepClick}
          />
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="lg:hidden">
          <QuoteStepper
            currentStep={currentStep}
            maxReachedIndex={maxReachedIndex}
            editorMode={editorMode}
            onStepClick={onStepClick}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
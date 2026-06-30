"use client";

import { ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getVisibleSteps,
  QUOTE_STEPS,
  QUOTE_STEP_META,
  type QuoteStep,
} from "./hooks/useQuoteBuilder";

type QuoteMobileFooterProps = {
  currentStep: QuoteStep;
  maxReachedIndex: number;
  editorMode: "guided" | "power";
  isPending: boolean;
  showNext: boolean;
  showSend?: boolean;
  onBack: () => void;
  onNext: () => void;
  onSend?: () => void;
  onStepClick: (step: QuoteStep) => void;
  /** Inline footer in the page editor shell; fixed bar for modal/mobile. */
  layout?: "fixed" | "inline";
};

export function QuoteMobileFooter({
  currentStep,
  maxReachedIndex,
  editorMode,
  isPending,
  showNext,
  showSend = false,
  onBack,
  onNext,
  onSend,
  onStepClick,
  layout = "fixed",
}: QuoteMobileFooterProps) {
  const visibleSteps = getVisibleSteps(editorMode);
  const currentIndex = visibleSteps.indexOf(currentStep);
  const canGoBack = currentIndex > 0;

  const isInline = layout === "inline";

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90",
        isInline
          ? "z-20"
          : "fixed inset-x-0 bottom-0 z-40 lg:hidden",
      )}
    >
      <div
        className={cn(
          "flex w-full items-center justify-between gap-3 py-2.5",
          isInline ? "px-0" : "mx-auto max-w-7xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <Button
          variant="outline"
          onClick={onBack}
          disabled={!canGoBack || isPending}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {showSend && onSend ? (
          <Button onClick={onSend} disabled={isPending} size="lg">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Send quote
                <Send className="h-4 w-4" />
              </>
            )}
          </Button>
        ) : showNext ? (
          <Button onClick={onNext} disabled={isPending} size="lg">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {editorMode === "guided" ? "Next" : "Save & continue"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <div className="w-[120px]" />
        )}
      </div>
    </div>
  );
}
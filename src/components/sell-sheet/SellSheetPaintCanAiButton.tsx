"use client";

import { useCallback, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { SellSheetAiLookupProgress } from "@/components/sell-sheet/SellSheetAiLookupProgress";
import { useAiLookupProgress } from "@/hooks/use-ai-lookup-progress";
import { findPaintCanImageWithAi } from "@/lib/sell-sheet/actions";
import type { AiLookupProgressStepId } from "@/lib/sell-sheet/ai-lookup-error";
import type {
  SellSheetApplicationType,
  SellSheetTierKey,
} from "@/types/sell-sheet";

type SellSheetPaintCanAiButtonProps = {
  manufacturer: string;
  paintType: string;
  applicationType: SellSheetApplicationType | "";
  tierKey: SellSheetTierKey;
  sellSheetId?: string;
  labels: {
    findWithAi: string;
    progress: {
      title: string;
      failedTitle: string;
      complete: string;
      close: string;
      tryAgain: string;
      steps: Record<AiLookupProgressStepId, string>;
      stepHints: Record<AiLookupProgressStepId, string>;
      errors: {
        headlines: {
          search: string;
          download: string;
          verify: string;
          analyze: string;
          generic: string;
        };
        tips: {
          retry: string;
          specificName: string;
          checkApplication: string;
          uploadManual: string;
        };
      };
    };
  };
  onProductFound: (result: {
    imageUrl: string;
    paintSystemFeatures: string[];
  }) => void;
  onError: (message: string) => void;
};

export function SellSheetPaintCanAiButton({
  manufacturer,
  paintType,
  applicationType,
  tierKey,
  sellSheetId,
  labels,
  onProductFound,
  onError,
}: SellSheetPaintCanAiButtonProps) {
  const errorLabels = useMemo(
    () => ({
      failedTitle: labels.progress.failedTitle,
      headlines: labels.progress.errors.headlines,
      tips: labels.progress.errors.tips,
    }),
    [labels.progress],
  );

  const {
    progressOpen,
    activeStepIndex,
    isComplete,
    errorPresentation,
    closeProgress,
    runWithProgress,
    isRunning,
  } = useAiLookupProgress(errorLabels);

  const canSearch =
    manufacturer.trim().length > 0 &&
    paintType.trim().length > 0 &&
    applicationType !== "";

  const runLookup = useCallback(() => {
    onError("");

    void runWithProgress(
      async () => {
        const result = await findPaintCanImageWithAi({
          manufacturer,
          paintType,
          applicationType,
          tierKey,
          sellSheetId,
        });

        if (!result.success) {
          return { success: false as const, error: result.error };
        }

        if (!result.data?.imageUrl) {
          return {
            success: false as const,
            error: "AI lookup did not return a product image.",
          };
        }

        return { success: true as const, data: result.data };
      },
      async (data) => {
        onProductFound({
          imageUrl: data.imageUrl,
          paintSystemFeatures: data.paintSystemFeatures ?? [],
        });
      },
      { onError },
    );
  }, [
    applicationType,
    manufacturer,
    onError,
    onProductFound,
    paintType,
    runWithProgress,
    sellSheetId,
    tierKey,
  ]);

  if (!canSearch) return null;

  return (
    <>
      <button
        type="button"
        onClick={runLookup}
        disabled={isRunning}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-50/80 px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-500/50 hover:bg-blue-100/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className={`h-4 w-4 ${isRunning ? "animate-pulse" : ""}`} />
        {labels.findWithAi}
      </button>

      <SellSheetAiLookupProgress
        open={progressOpen}
        manufacturer={manufacturer.trim()}
        paintType={paintType.trim()}
        activeStepIndex={activeStepIndex}
        isComplete={isComplete}
        errorPresentation={errorPresentation}
        labels={labels.progress}
        onClose={closeProgress}
        onRetry={errorPresentation ? runLookup : undefined}
      />
    </>
  );
}
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import {
  SellSheetAiLookupProgress,
  type AiLookupProgressStepId,
} from "@/components/sell-sheet/SellSheetAiLookupProgress";
import {
  presentAiLookupError,
  type AiLookupErrorPresentation,
} from "@/lib/sell-sheet/ai-lookup-error";
import { findPaintCanImageWithAi } from "@/lib/sell-sheet/actions";
import type {
  SellSheetApplicationType,
  SellSheetTierKey,
} from "@/types/sell-sheet";

const STEP_ORDER: AiLookupProgressStepId[] = [
  "searching",
  "foundProduct",
  "analyzingFeatures",
  "downloadingImage",
  "verifyingLabel",
  "applying",
];

const STEP_INTERVAL_MS = 1600;
const COMPLETE_DISPLAY_MS = 450;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const [isPending, startTransition] = useTransition();
  const [progressOpen, setProgressOpen] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [errorPresentation, setErrorPresentation] =
    useState<AiLookupErrorPresentation | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeStepRef = useRef(0);

  const errorLabels = useMemo(
    () => ({
      failedTitle: labels.progress.failedTitle,
      headlines: labels.progress.errors.headlines,
      tips: labels.progress.errors.tips,
    }),
    [labels.progress],
  );

  const canSearch =
    manufacturer.trim().length > 0 &&
    paintType.trim().length > 0 &&
    applicationType !== "";

  const clearStepTimer = useCallback(() => {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }, []);

  const startStepTimer = useCallback(() => {
    clearStepTimer();
    activeStepRef.current = 0;
    setActiveStepIndex(0);
    setIsComplete(false);
    setErrorPresentation(null);

    let current = 0;
    const maxAutoStep = STEP_ORDER.length - 1;

    stepTimerRef.current = setInterval(() => {
      if (current < maxAutoStep) {
        current += 1;
        activeStepRef.current = current;
        setActiveStepIndex(current);
      }
    }, STEP_INTERVAL_MS);
  }, [clearStepTimer]);

  const closeProgress = useCallback(() => {
    clearStepTimer();
    setProgressOpen(false);
    activeStepRef.current = 0;
    setActiveStepIndex(0);
    setIsComplete(false);
    setErrorPresentation(null);
  }, [clearStepTimer]);

  useEffect(() => () => clearStepTimer(), [clearStepTimer]);

  const runLookup = useCallback(() => {
    onError("");
    setProgressOpen(true);
    startStepTimer();

    startTransition(async () => {
      const result = await findPaintCanImageWithAi({
        manufacturer,
        paintType,
        applicationType,
        tierKey,
        sellSheetId,
      });

      clearStepTimer();

      if (!result.success) {
        const presentation = presentAiLookupError(result.error, errorLabels);
        activeStepRef.current = presentation.failedStepIndex;
        setActiveStepIndex(presentation.failedStepIndex);
        setErrorPresentation(presentation);
        onError(result.error);
        return;
      }

      activeStepRef.current = STEP_ORDER.length - 1;
      setActiveStepIndex(STEP_ORDER.length - 1);
      setIsComplete(true);
      await sleep(COMPLETE_DISPLAY_MS);

      const payload = {
        imageUrl: result.data!.imageUrl,
        paintSystemFeatures: result.data!.paintSystemFeatures ?? [],
      };

      closeProgress();
      onProductFound(payload);
    });
  }, [
    applicationType,
    closeProgress,
    clearStepTimer,
    errorLabels,
    manufacturer,
    onError,
    onProductFound,
    paintType,
    sellSheetId,
    startStepTimer,
    tierKey,
  ]);

  if (!canSearch) return null;

  return (
    <>
      <button
        type="button"
        onClick={runLookup}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-50/80 px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-500/50 hover:bg-blue-100/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className={`h-4 w-4 ${isPending ? "animate-pulse" : ""}`} />
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
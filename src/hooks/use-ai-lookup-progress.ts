"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  presentAiLookupError,
  type AiLookupErrorLabels,
  type AiLookupErrorPresentation,
  type AiLookupProgressStepId,
} from "@/lib/sell-sheet/ai-lookup-error";

export const AI_LOOKUP_STEP_ORDER: AiLookupProgressStepId[] = [
  "searching",
  "foundProduct",
  "analyzingFeatures",
  "downloadingImage",
  "verifyingLabel",
  "applying",
];

const STEP_INTERVAL_MS = 1600;
const COMPLETE_DISPLAY_MS = 450;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function stepIndexFor(stepId: AiLookupProgressStepId): number {
  const index = AI_LOOKUP_STEP_ORDER.indexOf(stepId);
  return index >= 0 ? index : 0;
}

export function useAiLookupProgress(errorLabels: AiLookupErrorLabels) {
  const [progressOpen, setProgressOpen] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [errorPresentation, setErrorPresentation] =
    useState<AiLookupErrorPresentation | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeStepRef = useRef(0);

  const clearStepTimer = useCallback(() => {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }, []);

  const beginProgress = useCallback(() => {
    clearStepTimer();
    activeStepRef.current = 0;
    setProgressOpen(true);
    setActiveStepIndex(0);
    setIsComplete(false);
    setErrorPresentation(null);
  }, [clearStepTimer]);

  const setStep = useCallback((stepId: AiLookupProgressStepId) => {
    const index = stepIndexFor(stepId);
    activeStepRef.current = index;
    setActiveStepIndex(index);
  }, []);

  const closeProgress = useCallback(() => {
    clearStepTimer();
    setProgressOpen(false);
    activeStepRef.current = 0;
    setActiveStepIndex(0);
    setIsComplete(false);
    setErrorPresentation(null);
  }, [clearStepTimer]);

  const completeProgress = useCallback(async () => {
    clearStepTimer();
    activeStepRef.current = AI_LOOKUP_STEP_ORDER.length - 1;
    setActiveStepIndex(AI_LOOKUP_STEP_ORDER.length - 1);
    setIsComplete(true);
    await sleep(COMPLETE_DISPLAY_MS);
    closeProgress();
  }, [clearStepTimer, closeProgress]);

  const failProgress = useCallback(
    (error: string, failedStepId?: AiLookupProgressStepId) => {
      clearStepTimer();
      const presentation = presentAiLookupError(error, errorLabels);
      const failedStepIndex = failedStepId
        ? stepIndexFor(failedStepId)
        : presentation.failedStepIndex;
      activeStepRef.current = failedStepIndex;
      setActiveStepIndex(failedStepIndex);
      setErrorPresentation({
        ...presentation,
        failedStepId: failedStepId ?? presentation.failedStepId,
        failedStepIndex,
      });
    },
    [clearStepTimer, errorLabels],
  );

  const startStepTimer = useCallback(() => {
    clearStepTimer();
    activeStepRef.current = 0;
    setActiveStepIndex(0);
    setIsComplete(false);
    setErrorPresentation(null);

    let current = 0;
    const maxAutoStep = AI_LOOKUP_STEP_ORDER.length - 1;

    stepTimerRef.current = setInterval(() => {
      if (current < maxAutoStep) {
        current += 1;
        activeStepRef.current = current;
        setActiveStepIndex(current);
      }
    }, STEP_INTERVAL_MS);
  }, [clearStepTimer]);

  useEffect(() => () => clearStepTimer(), [clearStepTimer]);

  /** Sell sheets: estimated step timing while a single server action runs. */
  const runWithProgress = useCallback(
    async <T>(
      task: () => Promise<ActionResult<T>>,
      onSuccess: (data: T) => void | Promise<void>,
      options?: { onError?: (error: string) => void },
    ) => {
      setProgressOpen(true);
      startStepTimer();

      const result = await task();
      clearStepTimer();

      if (!result.success) {
        failProgress(result.error);
        options?.onError?.(result.error);
        return;
      }

      activeStepRef.current = AI_LOOKUP_STEP_ORDER.length - 1;
      setActiveStepIndex(AI_LOOKUP_STEP_ORDER.length - 1);
      setIsComplete(true);
      await sleep(COMPLETE_DISPLAY_MS);

      closeProgress();
      await onSuccess(result.data);
    },
    [clearStepTimer, closeProgress, failProgress, startStepTimer],
  );

  const isRunning = progressOpen && !isComplete && !errorPresentation;

  return {
    progressOpen,
    activeStepIndex,
    isComplete,
    errorPresentation,
    closeProgress,
    beginProgress,
    setStep,
    completeProgress,
    failProgress,
    runWithProgress,
    isRunning,
  };
}
"use client";

import {
  AlertCircle,
  Check,
  Globe2,
  ImageDown,
  ListChecks,
  Loader2,
  PackageCheck,
  RefreshCw,
  ScanEye,
  Sparkles,
  X,
} from "lucide-react";
import type { AiLookupErrorPresentation } from "@/lib/sell-sheet/ai-lookup-error";
import type { AiLookupProgressStepId } from "@/lib/sell-sheet/ai-lookup-error";

export type { AiLookupProgressStepId };

type StepConfig = {
  id: AiLookupProgressStepId;
  label: string;
  icon: typeof Globe2;
};

type SellSheetAiLookupProgressLabels = {
  title: string;
  failedTitle: string;
  steps: Record<AiLookupProgressStepId, string>;
  stepHints: Record<AiLookupProgressStepId, string>;
  complete: string;
  close: string;
  tryAgain: string;
};

type SellSheetAiLookupProgressProps = {
  open: boolean;
  manufacturer: string;
  paintType: string;
  activeStepIndex: number;
  isComplete: boolean;
  errorPresentation: AiLookupErrorPresentation | null;
  labels: SellSheetAiLookupProgressLabels;
  onClose: () => void;
  onRetry?: () => void;
};

const STEP_ORDER: AiLookupProgressStepId[] = [
  "searching",
  "foundProduct",
  "analyzingFeatures",
  "downloadingImage",
  "verifyingLabel",
  "applying",
];

const STEP_ICONS: Record<AiLookupProgressStepId, typeof Globe2> = {
  searching: Globe2,
  foundProduct: PackageCheck,
  downloadingImage: ImageDown,
  verifyingLabel: ScanEye,
  analyzingFeatures: ListChecks,
  applying: Sparkles,
};

function stepStatus(
  index: number,
  activeStepIndex: number,
  isComplete: boolean,
  failedStepIndex: number | null,
): "pending" | "active" | "done" | "failed" {
  if (failedStepIndex !== null) {
    if (index < failedStepIndex) return "done";
    if (index === failedStepIndex) return "failed";
    return "pending";
  }

  if (isComplete || index < activeStepIndex) return "done";
  if (index === activeStepIndex) return "active";
  return "pending";
}

export function SellSheetAiLookupProgress({
  open,
  manufacturer,
  paintType,
  activeStepIndex,
  isComplete,
  errorPresentation,
  labels,
  onClose,
  onRetry,
}: SellSheetAiLookupProgressProps) {
  if (!open) return null;

  const steps: StepConfig[] = STEP_ORDER.map((id) => ({
    id,
    label: labels.steps[id],
    icon: STEP_ICONS[id],
  }));

  const failedStepIndex = errorPresentation?.failedStepIndex ?? null;
  const waitingOnServer =
    !errorPresentation && !isComplete && activeStepIndex >= steps.length - 1;
  const progressPercent = errorPresentation
    ? Math.round(((failedStepIndex ?? 0) / steps.length) * 100)
    : isComplete
      ? 100
      : waitingOnServer
        ? 92
        : Math.round(((activeStepIndex + 0.45) / steps.length) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-lookup-progress-title"
      aria-busy={!errorPresentation && !isComplete}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-b from-white via-white to-blue-50/40 shadow-2xl shadow-blue-900/10">
        <div
          className="absolute inset-x-0 top-0 h-1 bg-silver-200/80"
          aria-hidden
        >
          <div
            className={`h-full transition-all duration-700 ease-out ${
              errorPresentation
                ? "bg-gradient-to-r from-red-400 to-red-500"
                : waitingOnServer
                  ? "animate-pulse bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600"
                  : "bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-silver-500 transition hover:bg-silver-100 hover:text-navy-900"
          aria-label={labels.close}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-8 sm:px-8">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${
                errorPresentation
                  ? "bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/25"
                  : isComplete
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25"
                    : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25"
              }`}
            >
              {errorPresentation ? (
                <AlertCircle className="h-5 w-5" strokeWidth={2.5} />
              ) : isComplete ? (
                <Check className="h-5 w-5" strokeWidth={2.5} />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 pr-6">
              <h2
                id="ai-lookup-progress-title"
                className="font-display text-xl text-navy-900"
              >
                {errorPresentation
                  ? errorPresentation.headline
                  : isComplete
                    ? labels.complete
                    : labels.title}
              </h2>
              <p className="mt-1 text-sm text-silver-600">
                <span className="font-medium text-navy-800">{manufacturer}</span>
                <span className="mx-1.5 text-silver-400">·</span>
                <span>{paintType}</span>
              </p>
            </div>
          </div>

          <ol className="mt-6 space-y-0">
            {steps.map((step, index) => {
              const status = stepStatus(
                index,
                activeStepIndex,
                isComplete,
                failedStepIndex,
              );
              const Icon = step.icon;
              const isLast = index === steps.length - 1;

              return (
                <li key={step.id} className="relative flex gap-3.5 pb-5">
                  {!isLast ? (
                    <span
                      className={`absolute left-[1.125rem] top-9 h-[calc(100%-1.25rem)] w-0.5 transition-colors duration-500 ${
                        status === "done"
                          ? "bg-blue-400"
                          : status === "failed"
                            ? "bg-red-300"
                            : "bg-silver-200"
                      }`}
                      aria-hidden
                    />
                  ) : null}

                  <div className="relative z-10 shrink-0">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                        status === "done"
                          ? "border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-500/30"
                          : status === "failed"
                            ? "border-red-500 bg-red-50 text-red-600 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]"
                            : status === "active"
                              ? "border-blue-500 bg-blue-50 text-blue-600 shadow-[0_0_0_4px_rgba(43,108,184,0.15)]"
                              : "border-silver-300 bg-white text-silver-400"
                      }`}
                    >
                      {status === "done" ? (
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      ) : status === "failed" ? (
                        <AlertCircle className="h-4 w-4" strokeWidth={2.5} />
                      ) : status === "active" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 pt-1">
                    <p
                      className={`text-sm font-semibold transition-colors duration-300 ${
                        status === "pending"
                          ? "text-silver-400"
                          : status === "failed"
                            ? "text-red-700"
                            : status === "active"
                              ? "text-navy-900"
                              : "text-navy-800"
                      }`}
                    >
                      {step.label}
                    </p>
                    {status === "active" && !isComplete && !errorPresentation ? (
                      <p className="mt-0.5 text-xs leading-snug text-blue-600/80">
                        {step.id === "searching"
                          ? `site:${manufacturer.toLowerCase().replace(/\s+/g, "")}.com · ${labels.stepHints.searching}`
                          : labels.stepHints[step.id]}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>

          {errorPresentation ? (
            <div className="space-y-4 border-t border-silver-300/60 pt-5">
              <p className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm leading-relaxed text-red-800">
                {errorPresentation.detail}
              </p>

              {errorPresentation.tips.length > 0 ? (
                <ul className="space-y-2 rounded-xl border border-blue-500/10 bg-blue-50/40 px-4 py-3">
                  {errorPresentation.tips.map((tip) => (
                    <li
                      key={tip}
                      className="flex gap-2 text-sm leading-snug text-navy-800"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                        aria-hidden
                      />
                      {tip}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-outline-dark px-4 py-2 text-sm"
                >
                  {labels.close}
                </button>
                {onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {labels.tryAgain}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
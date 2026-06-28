export type AiLookupProgressStepId =
  | "searching"
  | "foundProduct"
  | "downloadingImage"
  | "verifyingLabel"
  | "analyzingFeatures"
  | "applying";

const STEP_ORDER: AiLookupProgressStepId[] = [
  "searching",
  "foundProduct",
  "analyzingFeatures",
  "downloadingImage",
  "verifyingLabel",
  "applying",
];

export type AiLookupErrorLabels = {
  failedTitle: string;
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

export type AiLookupErrorPresentation = {
  headline: string;
  detail: string;
  tips: string[];
  failedStepId: AiLookupProgressStepId;
  failedStepIndex: number;
};

function failedStepForError(error: string): AiLookupProgressStepId {
  const lower = error.toLowerCase();

  if (
    lower.includes("download") ||
    lower.includes("http 403") ||
    lower.includes("http 404") ||
    /http 5\d{2}/.test(lower) ||
    lower.includes("image file") ||
    lower.includes("unsupported format") ||
    lower.includes("hosted on") ||
    lower.includes("too large") ||
    lower.includes("file was empty")
  ) {
    return "downloadingImage";
  }

  if (
    lower.includes("label") ||
    lower.includes("not a paint") ||
    lower.includes("paint can")
  ) {
    return "verifyingLabel";
  }

  if (
    lower.includes("application") ||
    lower.includes("interior") ||
    lower.includes("exterior") ||
    lower.includes("features") ||
    lower.includes("specs")
  ) {
    return "analyzingFeatures";
  }

  if (
    lower.includes("official") ||
    lower.includes("manufacturer site") ||
    lower.includes("product page") ||
    lower.includes("retailer") ||
    lower.includes("confirm a matching") ||
    lower.includes("corroborate")
  ) {
    return "foundProduct";
  }

  return "searching";
}

function headlineForStep(
  stepId: AiLookupProgressStepId,
  labels: AiLookupErrorLabels,
): string {
  switch (stepId) {
    case "foundProduct":
    case "downloadingImage":
      return labels.headlines.download;
    case "verifyingLabel":
      return labels.headlines.verify;
    case "analyzingFeatures":
      return labels.headlines.analyze;
    case "searching":
      return labels.headlines.search;
    default:
      return labels.headlines.generic;
  }
}

export function presentAiLookupError(
  error: string,
  labels: AiLookupErrorLabels,
): AiLookupErrorPresentation {
  const failedStepId = failedStepForError(error);
  const failedStepIndex = Math.max(
    0,
    STEP_ORDER.indexOf(failedStepId),
  );

  const tips = [labels.tips.retry];

  const lower = error.toLowerCase();
  if (
    lower.includes("specific") ||
    lower.includes("product page") ||
    lower.includes("official") ||
    lower.includes("confirm")
  ) {
    tips.push(labels.tips.specificName);
  }

  if (lower.includes("interior") || lower.includes("exterior")) {
    tips.push(labels.tips.checkApplication);
  }

  tips.push(labels.tips.uploadManual);

  return {
    headline: headlineForStep(failedStepId, labels),
    detail: error,
    tips: [...new Set(tips)],
    failedStepId,
    failedStepIndex,
  };
}
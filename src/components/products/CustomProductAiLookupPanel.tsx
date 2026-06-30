"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  checkCustomProductPlatformMatches,
  enrichCustomProductDatasheet,
  fetchCustomProductCanImageFromManufacturer,
  resolveCatalogManufacturerName,
} from "@/app/app/(portal)/paint-library/actions";
import { SellSheetAiLookupProgress } from "@/components/sell-sheet/SellSheetAiLookupProgress";
import { Button } from "@/components/ui/button";
import { useAiLookupProgress } from "@/hooks/use-ai-lookup-progress";
import { applyAiLookupToCustomForm } from "@/lib/product-catalog/ai-custom-product-lookup";
import type { CustomProductFormValues } from "@/lib/paint-library/custom-product-form";
import type { PlatformProductMatch } from "@/lib/product-catalog/find-platform-product-matches";
import type { CustomProductAiLookupSuccess } from "@/lib/product-catalog/ai-custom-product-lookup";
import { CATALOG_AI_LOOKUP_PROGRESS_LABELS } from "@/lib/sell-sheet/ai-lookup-progress-labels";
import { cn } from "@/lib/utils";

type CustomProductAiLookupPanelProps = {
  form: CustomProductFormValues;
  onFormChange: (form: CustomProductFormValues) => void;
  onUsePlatformMatch: (match: PlatformProductMatch) => void;
  onLookupApplied?: () => void;
};

const PROGRESS_LABELS = CATALOG_AI_LOOKUP_PROGRESS_LABELS;

export function CustomProductAiLookupPanel({
  form,
  onFormChange,
  onUsePlatformMatch,
  onLookupApplied,
}: CustomProductAiLookupPanelProps) {
  const [platformMatches, setPlatformMatches] = useState<PlatformProductMatch[]>(
    [],
  );
  const [lookupResult, setLookupResult] =
    useState<CustomProductAiLookupSuccess | null>(null);
  const [canImageError, setCanImageError] = useState<string | null>(null);
  const [canImageDecision, setCanImageDecision] = useState<
    "pending" | "accepted" | "declined" | null
  >(null);

  const errorLabels = useMemo(
    () => ({
      failedTitle: PROGRESS_LABELS.failedTitle,
      headlines: PROGRESS_LABELS.errors.headlines,
      tips: PROGRESS_LABELS.errors.tips,
    }),
    [],
  );

  const {
    progressOpen,
    activeStepIndex,
    isComplete,
    errorPresentation,
    closeProgress,
    beginProgress,
    setStep,
    completeProgress,
    failProgress,
    isRunning,
  } = useAiLookupProgress(errorLabels);

  const canLookup =
    form.manufacturerName.trim().length > 0 && form.name.trim().length > 0;

  const runLookup = async () => {
    if (!canLookup || isRunning) return;

    setPlatformMatches([]);
    setLookupResult(null);
    setCanImageError(null);
    setCanImageDecision(null);

    let manufacturerName = form.manufacturerName.trim();
    const productName = form.name.trim();
    const applicationType = form.applicationType;

    const manufacturerResult = await resolveCatalogManufacturerName(
      manufacturerName,
    );
    if (manufacturerResult.success && manufacturerResult.data.wasMatched) {
      manufacturerName = manufacturerResult.data.canonicalName;
      onFormChange({ ...form, manufacturerName });
    }

    beginProgress();
    setStep("searching");

    const platformResult = await checkCustomProductPlatformMatches({
      manufacturerName,
      productName,
    });

    if (!platformResult.success) {
      failProgress(platformResult.error, "searching");
      return;
    }

    if (platformResult.data.matches.length > 0) {
      setStep("foundProduct");
      setPlatformMatches(platformResult.data.matches);
      await completeProgress();
      return;
    }

    setStep("analyzingFeatures");

    const enrichResult = await enrichCustomProductDatasheet({
      manufacturerName,
      productName,
      applicationType,
    });

    if (!enrichResult.success) {
      failProgress(enrichResult.error, "analyzingFeatures");
      return;
    }

    const { enrichment, suggestedAttributes } = enrichResult.data;
    const resolvedApplicationType =
      (suggestedAttributes.applicationType as typeof applicationType) ??
      applicationType;

    setStep("downloadingImage");

    const canImageResult = await fetchCustomProductCanImageFromManufacturer({
      manufacturerName,
      productName,
      applicationType: resolvedApplicationType,
      productPageUrl: enrichment.sourceUrl,
    });

    let canImageUrl: string | null = null;
    let canImagePreviewDataUrl: string | null = null;
    let resolvedCanImageError: string | null = null;

    if (canImageResult.success) {
      setStep("verifyingLabel");
      canImageUrl = canImageResult.data.canImageUrl;
      canImagePreviewDataUrl = canImageResult.data.previewDataUrl;
    } else {
      resolvedCanImageError = canImageResult.error;
    }

    setStep("applying");

    const enrichedResult: CustomProductAiLookupSuccess = {
      status: "enriched",
      productName,
      sourceUrl: enrichment.sourceUrl,
      suggestedAttributes,
      canImageUrl,
      canImagePreviewDataUrl,
      canImageError: resolvedCanImageError,
    };

    setLookupResult(enrichedResult);
    onFormChange(
      applyAiLookupToCustomForm(form, enrichedResult, form.canImageUrl),
    );
    onLookupApplied?.();
    setCanImageError(resolvedCanImageError);
    setCanImageDecision(canImagePreviewDataUrl ? "pending" : null);
    await completeProgress();

    if (canImagePreviewDataUrl) {
      toast.success("Product details found. Confirm the can image below.");
      return;
    }

    if (resolvedCanImageError) {
      toast.error(resolvedCanImageError);
    } else {
      toast.success("Product details found. Add a can image manually if needed.");
    }
  };

  const acceptCanImage = () => {
    if (!lookupResult?.canImageUrl) return;

    onFormChange(
      applyAiLookupToCustomForm(form, lookupResult, lookupResult.canImageUrl),
    );
    setCanImageDecision("accepted");
    toast.success("Can image applied.");
  };

  const declineCanImage = () => {
    setCanImageDecision("declined");
    toast.message("No problem — add your own can image in the form below.");
  };

  const showCanSection =
    lookupResult != null &&
    (lookupResult.canImagePreviewDataUrl != null ||
      canImageError != null ||
      canImageDecision === "declined");

  const showImageConfirmation =
    lookupResult?.canImagePreviewDataUrl != null &&
    canImageDecision === "pending";

  return (
    <>
      <div className="space-y-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Look up product details with AI
          </h3>
          <p className="text-xs text-muted-foreground">
            AI checks the platform catalog, reads the manufacturer data sheet,
            and pulls the paint can photo from the official product page — the
            same way sell sheets do.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={!canLookup || isRunning}
          onClick={() => void runLookup()}
        >
          <Sparkles className={cn("mr-2 h-4 w-4", isRunning && "animate-pulse")} />
          {isRunning ? "Looking up product…" : "Look up with AI"}
        </Button>

        {platformMatches.length > 0 ? (
          <div className="space-y-3 rounded-md border border-amber-500/35 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-100">
              This product is already in the PainterApps platform catalog.
            </p>
            <p className="text-xs text-amber-100/80">
              Add it from the platform instead of creating a duplicate custom
              product.
            </p>
            <div className="space-y-2">
              {platformMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-card/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{match.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {match.manufacturerName} · {match.applicationType}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onUsePlatformMatch(match)}
                  >
                    Add from platform
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {showCanSection ? (
          <div className="space-y-3 rounded-md border border-border/70 bg-card/30 p-3">
            {canImageError && !lookupResult?.canImagePreviewDataUrl ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Can image not found
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Product details were still filled in. Upload your own image
                    in the form below.
                  </p>
                </div>
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
                  {canImageError}
                </p>
              </>
            ) : canImageDecision === "declined" ? (
              <p className="text-sm text-muted-foreground">
                Skipped the suggested can image. Upload your own in the form
                below.
              </p>
            ) : lookupResult?.canImagePreviewDataUrl ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {showImageConfirmation
                      ? "Is this the correct image?"
                      : "Manufacturer can image"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {showImageConfirmation
                      ? "Found on the official product page. Product details are already filled in."
                      : "Using this can image for your product."}
                  </p>
                </div>

                <div className="flex justify-center py-2">
                  <div className="relative aspect-[3/4] w-full max-w-[140px] rounded-lg border border-border bg-card/40 p-2">
                    <Image
                      src={lookupResult.canImagePreviewDataUrl}
                      alt="Paint can from manufacturer site"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </div>

                {showImageConfirmation ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={acceptCanImage}>
                      Yes, use this image
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={declineCanImage}
                    >
                      No, I&apos;ll add my own
                    </Button>
                  </div>
                ) : canImageDecision === "accepted" ? (
                  <p className="text-xs text-muted-foreground">
                    This can image will be saved with your product.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <ImageIcon className="h-8 w-8 opacity-40" />
                <p>Add a can image in the form below.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <SellSheetAiLookupProgress
        open={progressOpen}
        manufacturer={form.manufacturerName.trim()}
        paintType={form.name.trim()}
        activeStepIndex={activeStepIndex}
        isComplete={isComplete}
        errorPresentation={errorPresentation}
        labels={PROGRESS_LABELS}
        onClose={closeProgress}
        onRetry={errorPresentation ? () => void runLookup() : undefined}
      />
    </>
  );
}
"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Compass,
  Loader2,
  PanelRightOpen,
  Send,
} from "lucide-react";
import { QuoteDocumentCanvas } from "@/components/quotes/document/QuoteDocumentCanvas";
import { QuoteDocumentView } from "@/components/quotes/document/QuoteDocumentView";
import { QuoteWizardRail } from "@/components/quotes/document/QuoteWizardRail";
import { buildTierPaintSummaries } from "@/lib/paint-library/tier-display";
import {
  buildPreviewQuote,
  buildPreviewRooms,
  buildPreviewTiers,
  type QuotePreviewInput,
} from "@/lib/quotes/preview-data";
import type { AutosaveStatus } from "@/components/quotes/hooks/useQuoteAutosave";
import {
  getAdjacentStep,
  type QuoteStep,
} from "@/components/quotes/hooks/useQuoteBuilder";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuoteDocumentLayoutProps = QuotePreviewInput & {
  companyName: string;
  companyLogoUrl?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  customerName?: string;
  currentStep: QuoteStep;
  maxReachedIndex: number;
  editorMode: "guided" | "power";
  isPending?: boolean;
  isEditable?: boolean;
  autosaveStatus?: AutosaveStatus;
  lastSavedAt?: Date | null;
  onExit?: () => void;
  onStepClick: (step: QuoteStep) => void;
  onNext: () => void;
  onBack: () => void;
  onSend?: () => void;
  onEditCustomer?: () => void;
  onEditSite?: () => void;
  onEditAreas?: () => void;
  onEditPaint?: () => void;
  onEditPackages?: () => void;
  onEditMessage?: () => void;
  onAddArea?: () => void;
  wizardPanel?: React.ReactNode;
};

export function QuoteDocumentLayout({
  companyName,
  companyLogoUrl,
  companyPhone,
  companyEmail,
  customerName,
  currentStep,
  maxReachedIndex,
  editorMode,
  isPending = false,
  isEditable = true,
  autosaveStatus,
  lastSavedAt,
  onExit,
  onStepClick,
  onNext,
  onBack,
  onSend,
  onEditCustomer,
  onEditSite,
  onEditAreas,
  onEditPaint,
  onEditPackages,
  onEditMessage,
  onAddArea,
  wizardPanel,
  tierState,
  lineItems,
  tierPaintConfig = [],
  paintProducts = [],
  rooms = [],
  ...rest
}: QuoteDocumentLayoutProps) {
  const [wizardOpen, setWizardOpen] = useState(true);

  const quote = buildPreviewQuote({
    tierState,
    lineItems,
    rooms,
    ...rest,
  });
  const tiers = buildPreviewTiers(rest.quoteId, tierState);
  const previewRooms = buildPreviewRooms(rest.quoteId, rooms);
  const tierPaintSummaries = buildTierPaintSummaries(
    tierPaintConfig,
    paintProducts,
  );

  const canGoBack = Boolean(
    getAdjacentStep(currentStep, "back", editorMode),
  );
  const canGoNext = currentStep !== "review" && isEditable;
  const showSend = currentStep === "review" && isEditable;

  const saveLabel =
    autosaveStatus === "saving"
      ? "Saving…"
      : autosaveStatus === "pending"
        ? "Unsaved"
        : lastSavedAt
          ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
          : null;

  return (
    <div className="quote-document-workspace flex h-full min-h-0 flex-1 overflow-hidden">
      {wizardOpen ? (
        <div className="hidden w-[min(100%,18rem)] shrink-0 lg:flex lg:w-72 xl:w-80">
          <QuoteWizardRail
            className="w-full"
            currentStep={currentStep}
            maxReachedIndex={maxReachedIndex}
            editorMode={editorMode}
            onStepClick={onStepClick}
            onClose={() => setWizardOpen(false)}
            onNext={onNext}
            onBack={onBack}
            canGoBack={canGoBack}
            canGoNext={canGoNext && !showSend}
            isPending={isPending}
          />
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-3 py-2.5 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {onExit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Back to quotes"
                onClick={onExit}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {quote.name?.trim() || "New estimate"}
              </p>
              {saveLabel ? (
                <p className="truncate text-xs text-muted-foreground">
                  {saveLabel}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={wizardOpen ? "secondary" : "outline"}
              className="gap-1.5"
              onClick={() => setWizardOpen((open) => !open)}
            >
              {wizardOpen ? (
                <PanelRightOpen className="h-3.5 w-3.5" />
              ) : (
                <Compass className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Wizard</span>
            </Button>
            {showSend && onSend ? (
              <Button type="button" size="sm" onClick={onSend} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={onNext}
                disabled={isPending || !canGoNext}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Continue"
                )}
              </Button>
            )}
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          <div
            className={cn(
              "min-h-0 flex-1 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950",
              wizardPanel && "lg:mr-0",
            )}
          >
            <QuoteDocumentCanvas>
              <QuoteDocumentView
                quote={quote}
                tiers={tiers}
                rooms={previewRooms}
                tierPaintSummaries={tierPaintSummaries}
                companyName={companyName}
                companyLogoUrl={companyLogoUrl}
                companyPhone={companyPhone}
                companyEmail={companyEmail}
                customerName={customerName}
                editable={isEditable}
                onEditCustomer={onEditCustomer}
                onEditSite={onEditSite}
                onEditAreas={onEditAreas}
                onEditPaint={onEditPaint}
                onEditPackages={onEditPackages}
                onEditMessage={onEditMessage}
                onAddArea={onAddArea}
              />
            </QuoteDocumentCanvas>
          </div>

          {wizardPanel ? (
            <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-border/60 bg-background/98 shadow-2xl backdrop-blur-md lg:static lg:max-w-sm xl:max-w-md">
              {wizardPanel}
            </div>
          ) : null}
        </div>

        {!wizardOpen ? (
          <div className="shrink-0 border-t border-border/60 bg-background p-3 lg:hidden">
            <QuoteWizardRail
              currentStep={currentStep}
              maxReachedIndex={maxReachedIndex}
              editorMode={editorMode}
              onStepClick={onStepClick}
              onNext={onNext}
              onBack={onBack}
              canGoBack={canGoBack}
              canGoNext={canGoNext && !showSend}
              isPending={isPending}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
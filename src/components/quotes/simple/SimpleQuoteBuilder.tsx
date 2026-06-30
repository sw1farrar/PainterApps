"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Home,
  Layers,
  Loader2,
  Save,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AddressFields } from "@/components/forms/AddressFields";
import { CustomerCombobox } from "@/components/quotes/CustomerCombobox";
import { useQuoteAutosave } from "@/components/quotes/hooks/useQuoteAutosave";
import { SimpleAreasStep } from "@/components/quotes/simple/SimpleAreasStep";
import { SimpleBaselineProductsStep } from "@/components/quotes/simple/SimpleBaselineProductsStep";
import { SimpleQuoteStepper } from "@/components/quotes/simple/SimpleQuoteStepper";
import { SimpleTierSystemsStep } from "@/components/quotes/simple/SimpleTierSystemsStep";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import {
  useSimpleQuoteBuilder,
  type UseSimpleQuoteBuilderOptions,
} from "@/components/quotes/simple/useSimpleQuoteBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { hasMinimumJobAddress } from "@/lib/address";
import { cn, formatCurrency } from "@/lib/utils";
import type { QuoteJobType } from "@/types/database";

const JOB_TYPE_LABELS: Record<QuoteJobType, string> = {
  interior: "Interior",
  exterior: "Exterior",
  both: "Interior + Exterior",
  specialty: "Specialty",
};

function customerInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const JOB_TYPE_OPTIONS: {
  value: QuoteJobType;
  label: string;
  shortLabel: string;
  icon: typeof Home;
}[] = [
  { value: "interior", label: "Interior", shortLabel: "Interior", icon: Home },
  {
    value: "exterior",
    label: "Exterior",
    shortLabel: "Exterior",
    icon: Building2,
  },
  {
    value: "both",
    label: "Interior + Exterior",
    shortLabel: "Both",
    icon: Layers,
  },
  {
    value: "specialty",
    label: "Specialty",
    shortLabel: "Specialty",
    icon: Sparkles,
  },
];

type SimpleQuoteBuilderProps = UseSimpleQuoteBuilderOptions & {
  onExit?: () => void;
};

export function SimpleQuoteBuilder(props: SimpleQuoteBuilderProps) {
  const router = useRouter();
  const builder = useSimpleQuoteBuilder(props);
  const {
    step,
    maxReachedIndex,
    goToStep,
    handleNext,
    handleBack,
    handleSend,
    error,
    isPending,
    isEditable,
    quoteId,
    status,
    customers,
    customerId,
    setCustomerId,
    addCustomer,
    selectedCustomer,
    quoteName,
    setQuoteName,
    jobType,
    setJobType,
    jobAddress,
    setJobAddress,
    areas,
    itemsSubtotal,
    suggestedJobPricing,
    projectGrossMarginPct,
    setProjectGrossMarginPct,
    quotePrice,
    setQuotePrice,
    customMessage,
    setCustomMessage,
    baselinePaintSystems,
    updateBaselineSystem,
    tierPaintConfig,
    updateTierPaint,
    tierRows,
    updateTierDisplayName,
    baselineTopcoatName,
    paintProducts,
    getDraft,
    saveDraft,
    ensureQuote,
  } = builder;

  const {
    rooms,
    buildAllLineItems,
    saveAreaEdits,
  } = areas;

  const [isSavingClose, setIsSavingClose] = useState(false);
  const [isSavingArea, setIsSavingArea] = useState(false);

  const { status: autosaveStatus, lastSavedAt, markBaseline } = useQuoteAutosave({
    quoteId,
    enabled: Boolean(quoteId) && status === "draft",
    draft: getDraft(),
  });

  const handleSaveArea = useCallback(
    async (index: number) => {
      setIsSavingArea(true);
      try {
        let id = quoteId;
        if (!id) {
          id = (await ensureQuote()) ?? "";
          if (!id) return;
        }

        const result = await saveDraft(id);
        if (!result.success) {
          toast.error(result.error ?? "Could not save area");
          return;
        }

        markBaseline();
        saveAreaEdits(index);
        toast.success("Area saved");
      } finally {
        setIsSavingArea(false);
      }
    },
    [quoteId, ensureQuote, saveDraft, markBaseline, saveAreaEdits],
  );

  const canGoBack = step !== "job";
  const isSendStep = step === "send";

  const trimmedJobName = quoteName.trim();
  const headerCustomerLabel =
    selectedCustomer?.name ??
    (props.mode === "create" ? "Select customer" : "No customer");

  const autosaveLabel =
    autosaveStatus === "saving"
      ? "Saving…"
      : autosaveStatus === "pending"
        ? "Unsaved"
        : autosaveStatus === "error"
          ? "Save failed"
          : lastSavedAt
            ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
            : quoteId
              ? "Saved"
              : null;

  const handleSaveAndClose = useCallback(async () => {
    if (isSavingClose || isPending) return;
    setIsSavingClose(true);
    try {
      if (isEditable && status === "draft") {
        let saveId = quoteId || null;
        if (!saveId && customerId && hasMinimumJobAddress(jobAddress)) {
          saveId = await ensureQuote();
        }
        if (saveId) {
          const lineItems =
            rooms.length > 0 ? buildAllLineItems() : undefined;
          const result = await saveDraft(saveId, lineItems);
          if (!result.success) {
            toast.error(result.error ?? "Could not save quote");
          } else {
            toast.success("Quote saved");
          }
        }
      }
      router.push("/app/quotes");
    } finally {
      setIsSavingClose(false);
    }
  }, [
    isSavingClose,
    isPending,
    isEditable,
    status,
    quoteId,
    customerId,
    jobAddress,
    rooms.length,
    buildAllLineItems,
    ensureQuote,
    saveDraft,
    router,
  ]);

  return (
    <div className="quote-editor-page">
      <header className="shrink-0 border-b border-border/60 px-2 py-2 sm:px-4">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center gap-2 sm:gap-3">
          {selectedCustomer ? (
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {customerInitials(selectedCustomer.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60">
              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="min-w-0 truncate text-sm text-foreground sm:text-base">
              <span className="font-medium text-muted-foreground">
                {props.mode === "create" ? "New quote" : "Quote"}
              </span>
              <span className="mx-1.5 text-border/80">·</span>
              <span
                className={cn(
                  "font-semibold tracking-tight",
                  selectedCustomer
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {headerCustomerLabel}
              </span>
              {trimmedJobName ? (
                <>
                  <span className="mx-1.5 text-border/80">·</span>
                  <span className="font-display font-semibold tracking-tight text-foreground">
                    {trimmedJobName}
                  </span>
                </>
              ) : null}
            </h1>
            <div className="flex flex-wrap items-center gap-1">
              <Badge
                variant="outline"
                className="px-1.5 py-0 text-[10px] font-normal leading-5"
              >
                {JOB_TYPE_LABELS[jobType]}
              </Badge>
              {status === "draft" && autosaveLabel ? (
                <Badge
                  variant={
                    autosaveStatus === "error"
                      ? "destructive"
                      : autosaveStatus === "saving" ||
                          autosaveStatus === "pending"
                        ? "secondary"
                        : "outline"
                  }
                  className="px-1.5 py-0 text-[10px] font-normal leading-5"
                >
                  {autosaveLabel}
                </Badge>
              ) : null}
              {status !== "draft" ? (
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px] capitalize leading-5"
                >
                  {status}
                </Badge>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs sm:px-3"
            onClick={handleSaveAndClose}
            disabled={isSavingClose || isPending}
          >
            {isSavingClose ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Save & close</span>
            <span className="sm:hidden">Close</span>
          </Button>
        </div>
      </header>

      <div className="quote-editor-workspace">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-y-auto px-2 py-4 sm:px-4 sm:py-5">
          <SimpleQuoteStepper
            className="mb-3"
            currentStep={step}
            maxReachedIndex={maxReachedIndex}
            onStepClick={isEditable ? goToStep : undefined}
          />
          {step === "job" ? (
            <section className="rounded-xl border border-border/50 bg-card/30 p-3 shadow-sm sm:p-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <CustomerCombobox
                  compact
                  customers={customers}
                  value={customerId}
                  onChange={setCustomerId}
                  onCustomerCreated={addCustomer}
                />
                <div className="space-y-1">
                  <Label htmlFor="job-name" className="text-xs">
                    Job name
                  </Label>
                  <Input
                    id="job-name"
                    className="h-9"
                    value={quoteName}
                    onChange={(e) => setQuoteName(e.target.value)}
                    placeholder={
                      selectedCustomer
                        ? `${selectedCustomer.name} estimate`
                        : "Job name"
                    }
                    disabled={!isEditable}
                  />
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <Label className="text-xs">Job type</Label>
                <div className="flex gap-1.5">
                  {JOB_TYPE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const selected = jobType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        onClick={() => setJobType(option.value)}
                        className={cn(
                          "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors",
                          selected
                            ? "border-primary/60 bg-primary/10 text-foreground"
                            : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/30 hover:bg-muted/30",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate text-[11px] font-medium sm:text-xs">
                          <span className="sm:hidden">{option.shortLabel}</span>
                          <span className="hidden sm:inline">{option.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Job address</Label>
                  {selectedCustomer ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        setJobAddress({
                          job_address: selectedCustomer.address ?? "",
                          job_address_line2:
                            selectedCustomer.address_line2 ?? "",
                          job_city: selectedCustomer.city ?? "",
                          job_state: selectedCustomer.state ?? "",
                          job_zip: selectedCustomer.zip ?? "",
                        })
                      }
                    >
                      Use customer address
                    </Button>
                  ) : null}
                </div>
                <AddressFields
                  compact
                  idPrefix="simple-job"
                  value={{
                    address: jobAddress.job_address,
                    address_line2: jobAddress.job_address_line2 ?? "",
                    city: jobAddress.job_city ?? "",
                    state: jobAddress.job_state ?? "",
                    zip: jobAddress.job_zip ?? "",
                  }}
                  onChange={(value) =>
                    setJobAddress({
                      job_address: value.address ?? "",
                      job_address_line2: value.address_line2 ?? "",
                      job_city: value.city ?? "",
                      job_state: value.state ?? "",
                      job_zip: value.zip ?? "",
                    })
                  }
                  line1Label="Street address"
                  required
                />
              </div>
            </section>
          ) : null}

          {step === "baseline" ? (
            <SimpleBaselineProductsStep
              jobType={jobType}
              systems={baselinePaintSystems}
              paintProducts={paintProducts}
              onChange={updateBaselineSystem}
            />
          ) : null}

          {step === "items" ? (
            <SimpleAreasStep
              company={props.company}
              jobType={jobType}
              rooms={areas.rooms}
              areaSubtotals={areas.areaSubtotals}
              areaCostBreakdowns={areas.areaCostBreakdowns}
              itemsSubtotal={itemsSubtotal}
              coverage={areas.coverage}
              paintDefaults={areas.paintDefaults}
              paintProducts={areas.paintProducts}
              editingAreaIndex={areas.editingAreaIndex}
              onAddAreaTemplate={areas.addAreaFromTemplate}
              onDuplicateArea={areas.duplicateArea}
              onOpenArea={areas.openAreaEditor}
              onCloseAreaEditor={areas.closeAreaEditor}
              onUpdateArea={areas.updateArea}
              onToggleSurface={areas.toggleAreaSurface}
              onUpdateSurface={areas.updateSurface}
              onConfirmCloset={(index, dims) => {
                areas.updateClosetSurface(index, dims);
              }}
              onSetPaintDefault={areas.setPaintDefault}
              onResetSurfaceProduct={areas.resetSurfaceProduct}
              onToggleScopeCategory={areas.toggleScopeCategory}
              onApplyDimensions={areas.applyWallDimensions}
              onSaveArea={handleSaveArea}
              isSavingArea={isSavingArea}
              onDeleteArea={areas.deleteArea}
              isAreaDirty={areas.isAreaDirty}
              onRevertArea={areas.revertAreaEdits}
              surfacesForArea={areas.surfacesForArea}
            />
          ) : null}

          {step === "tiers" ? (
            <SimpleTierSystemsStep
              paintProducts={paintProducts}
              tierPaintConfig={tierPaintConfig}
              tierRows={tierRows}
              baselineTopcoatName={baselineTopcoatName}
              onTierPaintChange={updateTierPaint}
              onTierDisplayNameChange={updateTierDisplayName}
            />
          ) : null}

          {step === "send" ? (
            <section className="rounded-xl border border-border/50 bg-card/30 p-3 shadow-sm sm:p-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
                <div className="min-w-0">
                  <span className="text-muted-foreground">Customer </span>
                  <span className="font-medium text-foreground">
                    {selectedCustomer?.name ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Areas </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {areas.rooms.length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Direct cost </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(suggestedJobPricing.directCost)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Suggested price </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(suggestedJobPricing.sellingPrice)}
                  </span>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
                {areas.rooms.map((room, index) => (
                  <li
                    key={`${room.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/30 px-2 py-1.5 sm:px-3 sm:py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {room.name}
                      </p>
                      {room.sq_ft > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {room.sq_ft} sq ft
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(areas.areaSubtotals[index] ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 grid gap-3 border-t border-border/40 pt-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="project-gross-margin" className="text-xs">
                    Gross margin (%)
                  </Label>
                  <Input
                    id="project-gross-margin"
                    type="number"
                    min={0}
                    max={99}
                    step={1}
                    className="h-9"
                    value={projectGrossMarginPct}
                    onChange={(e) =>
                      setProjectGrossMarginPct(Number(e.target.value) || 0)
                    }
                    disabled={!isEditable}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Default from estimate defaults; adjust per quote.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="quote-price" className="text-xs">
                    Quote price
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="quote-price"
                      type="number"
                      min={0}
                      step={1}
                      className="h-9 pl-7 text-lg font-semibold"
                      value={quotePrice || ""}
                      onChange={(e) => setQuotePrice(Number(e.target.value))}
                      disabled={!isEditable}
                    />
                  </div>
                  {suggestedJobPricing.directCost > 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      Direct {formatCurrency(suggestedJobPricing.directCost)}
                      {suggestedJobPricing.overhead > 0
                        ? ` + overhead ${formatCurrency(suggestedJobPricing.overhead)}`
                        : ""}
                      {suggestedJobPricing.grossMarginPct > 0
                        ? ` → ${suggestedJobPricing.grossMarginPct}% margin`
                        : ""}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="custom-message" className="text-xs">
                    Note to customer
                    <span className="ml-1 font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="custom-message"
                    rows={2}
                    className="min-h-0 resize-none text-sm"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Thanks for the opportunity — looking forward to working with you."
                    disabled={!isEditable}
                  />
                </div>
              </div>

              {isEditable ? (
                <Button
                  type="button"
                  className="mt-3 h-9 w-full gap-1.5 text-sm"
                  onClick={handleSend}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send quote
                    </>
                  )}
                </Button>
              ) : (
                <p className="mt-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  This quote has been sent. Revise to draft from the quotes list
                  to make changes.
                </p>
              )}
            </section>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {!isSendStep ? (
        <footer className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-4 border-t border-border/60 px-2 py-4 sm:px-4 sm:py-5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-w-[6.5rem] rounded-xl"
            onClick={handleBack}
            disabled={!canGoBack || isPending}
          >
            Back
          </Button>
          <Button
            type="button"
            size="lg"
            className="min-w-[6.5rem] rounded-xl"
            onClick={handleNext}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Continue"
            )}
          </Button>
        </footer>
      ) : (
        <footer className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-4 border-t border-border/60 px-2 py-4 sm:px-4 sm:py-5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-w-[6.5rem] rounded-xl"
            onClick={handleBack}
            disabled={isPending}
          >
            Back
          </Button>
          <div />
        </footer>
      )}
    </div>
  );
}
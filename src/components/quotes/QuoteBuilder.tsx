"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppDrawer } from "@/components/portal/AppDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QUOTE_PAINT_TIERS } from "@/lib/paint-library/types";
import { estimateGallons } from "@/lib/quotes/pricing";
import type { LineItemType } from "@/types/database";
import {
  getEditorOnboardingSeen,
  getPaintOnboardingSeen,
  setEditorOnboardingSeen,
  setPaintOnboardingSeen,
} from "@/lib/quotes/editor-mode";
import { QuoteUnsavedPrompt } from "./QuoteUnsavedPrompt";
import { QuoteCommandPalette } from "./QuoteCommandPalette";
import { SaveQuoteTemplateDialog } from "./SaveQuoteTemplateDialog";
import {
  QuoteEditorOnboarding,
  type QuoteOnboardingMode,
} from "./QuoteEditorOnboarding";
import { QuoteModalLayout } from "./QuoteModalLayout";
import { QuoteHeader } from "./QuoteHeader";
import { QuoteMobileFooter } from "./QuoteMobileFooter";
import { QuotePreviewPane } from "./QuotePreviewPane";
import { QuoteStepper } from "./QuoteStepper";
import { QuoteTotalsBar } from "./QuoteTotalsBar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AreasStep } from "./steps/AreasStep";
import { BasicsStep } from "./steps/BasicsStep";
import { LineItemsStep } from "./steps/LineItemsStep";
import { OptionsStep } from "./steps/OptionsStep";
import { PaintOptionsStep } from "./steps/PaintOptionsStep";
import { PolishStep } from "./steps/PolishStep";
import { SendStep } from "./steps/SendStep";
import { useQuoteAutosave } from "./hooks/useQuoteAutosave";
import { useQuoteKeyboardShortcuts } from "./hooks/useQuoteKeyboardShortcuts";
import { QuoteDocumentLayout } from "@/components/quotes/document/QuoteDocumentLayout";
import {
  QUOTE_STEP_META,
  useQuoteBuilder,
  type UseQuoteBuilderOptions,
} from "./hooks/useQuoteBuilder";

type QuoteBuilderProps = UseQuoteBuilderOptions & {
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onFlushReady?: (flush: () => Promise<void>) => void;
};

export function QuoteBuilder({
  onDirtyChange,
  onSavingChange,
  onFlushReady,
  workspaceMode = "page",
  onWorkspaceClose,
  onPopOut,
  ...props
}: QuoteBuilderProps) {
  const router = useRouter();
  const builder = useQuoteBuilder({
    ...props,
    workspaceMode,
    onWorkspaceClose,
    onPopOut,
  });
  const {
    mode,
    step,
    stepIndex,
    maxReachedIndex,
    editorMode,
    handleEditorModeChange,
    goToStep,
    costBreakdown,
    error,
    isPending,
    quoteId,
    status,
    quoteName,
    setQuoteName,
    jobType,
    setJobType,
    estimationMode,
    setEstimationMode,
    customMessage,
    setCustomMessage,
    customerId,
    setCustomerId,
    jobAddress,
    setJobAddress,
    beforePhotos,
    setBeforePhotos,
    rooms,
    setRooms,
    selectedAreaIndex,
    setSelectedAreaIndex,
    areaSubtotals,
    surfacesForSelectedArea,
    lineItemsForSelectedArea,
    globalManualLineItems,
    addAreaByName,
    updateArea,
    deleteArea,
    reorderAreas,
    duplicateArea,
    bulkDeleteAreas,
    bulkDuplicateAreas,
    bulkSetAreasOptional,
    applyWallDimensions,
    addSurfaceToArea,
    updateSurfaceAt,
    removeSurfaceAt,
    openLineItemForArea,
    regenerateArea,
    company,
    lineItems,
    setLineItems,
    tierState,
    pricingSummary,
    subtotal,
    quoteTotals,
    tierBase,
    autoTierPrices,
    roomDrawerOpen,
    setRoomDrawerOpen,
    lineItemDrawerOpen,
    setLineItemDrawerOpen,
    editingRoomIndex,
    editingLineItemIndex,
    roomDraft,
    setRoomDraft,
    lineItemDraft,
    setLineItemDraft,
    coverage,
    selectedCustomer,
    portalUrl,
    customers,
    addCustomer,
    isEditable,
    getDraft,
    saveDraftNow,
    syncChildrenFromServer,
    handleNext,
    handleBack,
    openRoomDrawer,
    saveRoomDraft,
    openLineItemDrawer,
    generateFromRooms,
    saveLineItemDraft,
    applyAutoPricing,
    addOptionalPreset,
    toggleLineItemOptional,
    removeLineItemAt,
    updateTier,
    tierPaintConfig,
    paintProducts,
    paintPresets,
    paintableSqFt,
    updateTierPaint,
    applyPaintPreset,
    applyCompanyPaintDefaults,
    openCustomOptionalItem,
    handleSendQuote,
    handleCopyPortalLink,
    handleDuplicateQuote,
    handleReviseToDraft,
    handleResendQuote,
    jobId,
    parseLines,
    joinLines,
  } = builder;

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [onboardingMode, setOnboardingMode] =
    useState<QuoteOnboardingMode | null>(null);
  const [basicsDrawerOpen, setBasicsDrawerOpen] = useState(false);
  const [pageExitPromptOpen, setPageExitPromptOpen] = useState(false);

  useEffect(() => {
    const seen = getEditorOnboardingSeen();
    if (!seen[editorMode]) {
      setOnboardingMode(editorMode);
    }
  }, [editorMode]);

  useEffect(() => {
    if (step !== "paint-options" || getPaintOnboardingSeen()) return;
    setOnboardingMode((current) => current ?? "paint");
  }, [step]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openPreview = useCallback(() => setPreviewOpen(true), []);

  useQuoteKeyboardShortcuts({
    enabled: status === "draft",
    editorMode,
    step,
    onOpenPalette: openPalette,
    onSave: saveDraftNow,
    onNext: handleNext,
    onAddArea:
      step === "estimator"
        ? () => addAreaByName("New Area")
        : undefined,
    onDuplicateArea:
      step === "estimator"
        ? () => duplicateArea(selectedAreaIndex)
        : undefined,
  });

  const {
    status: autosaveStatus,
    lastSavedAt,
    flushSave,
    hasPendingChanges,
  } = useQuoteAutosave({
    quoteId,
    enabled: Boolean(quoteId) && status === "draft",
    draft: getDraft(),
  });

  const isWorkspaceDirty =
    status === "draft" &&
    (hasPendingChanges ||
      autosaveStatus === "pending" ||
      autosaveStatus === "saving");

  useEffect(() => {
    onDirtyChange?.(isWorkspaceDirty);
  }, [isWorkspaceDirty, onDirtyChange]);

  useEffect(() => {
    onSavingChange?.(autosaveStatus === "saving");
  }, [autosaveStatus, onSavingChange]);

  const onFlushReadyRef = useRef(onFlushReady);
  onFlushReadyRef.current = onFlushReady;

  useEffect(() => {
    onFlushReadyRef.current?.(flushSave);
  }, [flushSave]);

  const leaveWorkspace = useCallback(async () => {
    if (workspaceMode === "modal" && onWorkspaceClose) {
      onWorkspaceClose();
      return;
    }
    router.push("/app/quotes");
  }, [onWorkspaceClose, router, workspaceMode]);

  const handleExit = useCallback(() => {
    if (isWorkspaceDirty) {
      if (workspaceMode === "modal") return;
      setPageExitPromptOpen(true);
      return;
    }
    void (async () => {
      if (quoteId && status === "draft") {
        await flushSave();
        if (workspaceMode === "page") {
          toast.success("Draft saved");
        }
      }
      await leaveWorkspace();
    })();
  }, [
    flushSave,
    isWorkspaceDirty,
    leaveWorkspace,
    quoteId,
    status,
    workspaceMode,
  ]);

  const handleSaveAndExit = useCallback(async () => {
    if (quoteId && status === "draft") {
      await flushSave();
    }
    setPageExitPromptOpen(false);
    await leaveWorkspace();
  }, [flushSave, leaveWorkspace, quoteId, status]);

  const dismissOnboarding = () => {
    if (onboardingMode === "paint") {
      setPaintOnboardingSeen();
    } else if (onboardingMode) {
      setEditorOnboardingSeen(onboardingMode);
    }
    setOnboardingMode(null);
  };

  const stepPanelClassName =
    workspaceMode === "page" || workspaceMode === "document"
      ? workspaceMode === "document"
        ? "min-h-0"
        : "flex min-h-0 flex-1 flex-col"
      : isEditable || step === "review"
        ? "min-h-[320px]"
        : "pointer-events-none min-h-[320px] opacity-60";

  const stepPanel = (
    <div className={stepPanelClassName}>
        {step === "setup" ? (
          props.skipSetup ? (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Customer and job details were set on the start screen.{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => setBasicsDrawerOpen(true)}
                >
                  Edit job details
                </button>
              </p>
            </div>
          ) : (
            <BasicsStep
              customers={customers}
              customerId={customerId}
              onCustomerIdChange={setCustomerId}
              onCustomerCreated={addCustomer}
              jobType={jobType}
              onJobTypeChange={setJobType}
              estimationMode={estimationMode}
              onEstimationModeChange={setEstimationMode}
              jobAddress={jobAddress}
              onJobAddressChange={setJobAddress}
              beforePhotos={beforePhotos}
              onBeforePhotosChange={setBeforePhotos}
              quoteId={quoteId || undefined}
              selectedCustomer={selectedCustomer}
            />
          )
        ) : null}

        {step === "estimator" ? (
          <AreasStep
            fillWorkspace={workspaceMode === "page"}
            rooms={rooms}
            selectedAreaIndex={selectedAreaIndex}
            areaSubtotals={areaSubtotals}
            surfacesForSelectedArea={surfacesForSelectedArea}
            lineItemsForSelectedArea={lineItemsForSelectedArea}
            globalManualLineItems={globalManualLineItems}
            estimationMode={estimationMode}
            company={company}
            coverage={coverage}
            pricingSummary={pricingSummary}
            onSelectArea={setSelectedAreaIndex}
            onReorderAreas={reorderAreas}
            onAddArea={addAreaByName}
            onOpenCustomArea={() => openRoomDrawer()}
            onUpdateArea={updateArea}
            onApplyDimensions={applyWallDimensions}
            onDuplicateArea={duplicateArea}
            onDeleteArea={deleteArea}
            onAddSurface={addSurfaceToArea}
            onUpdateSurface={updateSurfaceAt}
            onRemoveSurface={removeSurfaceAt}
            onEditRoom={openRoomDrawer}
            onRegenerateAll={generateFromRooms}
            onRegenerateArea={regenerateArea}
            onAddLineItemForArea={openLineItemForArea}
            onAddGlobalLineItem={() => openLineItemForArea(null)}
            onEditGlobalLineItem={openLineItemDrawer}
            onRemoveGlobalLineItem={removeLineItemAt}
            lineItems={lineItems}
            onToggleLineItemOptional={toggleLineItemOptional}
            powerMode={editorMode === "power"}
            onBulkDelete={bulkDeleteAreas}
            onBulkDuplicate={bulkDuplicateAreas}
            onBulkSetOptional={bulkSetAreasOptional}
          />
        ) : null}

        {step === "line-items" ? (
          <LineItemsStep
            lineItems={lineItems}
            subtotal={subtotal}
            quoteTotals={quoteTotals}
            hasRooms={rooms.length > 0}
            onGenerateFromRooms={generateFromRooms}
            onAddLineItem={() => openLineItemDrawer()}
            onEditLineItem={openLineItemDrawer}
            onRemoveLineItem={(index) =>
              setLineItems((prev) => prev.filter((_, i) => i !== index))
            }
          />
        ) : null}

        {step === "paint-options" ? (
          <PaintOptionsStep
            company={company}
            paintableSqFt={paintableSqFt}
            tierPaintConfig={tierPaintConfig}
            products={paintProducts}
            presets={paintPresets}
            onTierPaintChange={updateTierPaint}
            onApplyCompanyDefaults={applyCompanyPaintDefaults}
            onApplyPreset={applyPaintPreset}
          />
        ) : null}

        {step === "tiers" ? (
          <OptionsStep
            lineItems={lineItems}
            materialMarkup={0}
            onAddPreset={addOptionalPreset}
            onToggleOptional={toggleLineItemOptional}
            onRemoveItem={removeLineItemAt}
            onAddCustomOptional={openCustomOptionalItem}
          />
        ) : null}

        {step === "polish" ? (
          <PolishStep
            quoteId={quoteId || "preview"}
            company={company}
            quoteName={quoteName}
            customerName={selectedCustomer?.name}
            customerId={customerId}
            jobType={jobType}
            estimationMode={estimationMode}
            customMessage={customMessage}
            onCustomMessageChange={setCustomMessage}
            jobAddress={jobAddress}
            beforePhotos={beforePhotos}
            status={status}
            rooms={rooms}
            lineItems={lineItems}
            subtotal={subtotal}
            tierState={tierState}
            tierBase={tierBase}
            autoTierPrices={autoTierPrices}
            onTierChange={updateTier}
            onApplyAutoPricing={applyAutoPricing}
            parseLines={parseLines}
            joinLines={joinLines}
            tierPaintConfig={QUOTE_PAINT_TIERS.map(
              (tier) => tierPaintConfig[tier],
            )}
            paintProducts={paintProducts}
          />
        ) : null}

        {step === "review" ? (
          <SendStep
            quoteTotals={quoteTotals}
            tierState={tierState}
            quoteId={quoteId || undefined}
            portalUrl={portalUrl}
            status={status}
            customerName={selectedCustomer?.name}
            mode={mode}
            isPending={isPending}
            onSend={handleSendQuote}
            onCopyPortalLink={handleCopyPortalLink}
            onDuplicate={handleDuplicateQuote}
            onReviseToDraft={handleReviseToDraft}
            onResend={handleResendQuote}
            onSaveAsTemplate={() => setTemplateDialogOpen(true)}
            onOpenPreview={openPreview}
            jobId={jobId}
          />
        ) : null}
    </div>
  );

  const statusBanner =
    status !== "draft" ? (
      <div
        role="status"
        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground"
      >
        This quote is <span className="font-medium capitalize">{status}</span>.
        {status === "sent" || status === "declined" ? (
          <>
            {" "}
            Use <span className="font-medium">Revise quote</span> on the Send step
            to edit and resend.
          </>
        ) : status === "accepted" ? (
          <> View the linked job from the Send step.</>
        ) : null}
      </div>
    ) : null;

  const stepFooter = (
    <QuoteMobileFooter
      currentStep={step}
      maxReachedIndex={maxReachedIndex}
      editorMode={editorMode}
      isPending={isPending}
      showNext={step !== "review" && isEditable}
      showSend={step === "review" && status === "draft"}
      onBack={handleBack}
      onNext={handleNext}
      onSend={handleSendQuote}
      onStepClick={goToStep}
      layout={workspaceMode === "page" ? "inline" : "fixed"}
    />
  );

  const headerBlock = (
    <QuoteHeader
      quoteName={quoteName}
      onQuoteNameChange={setQuoteName}
      customerName={selectedCustomer?.name}
      jobType={jobType}
      status={status}
      editorMode={editorMode}
      onEditorModeChange={handleEditorModeChange}
      onOpenCommandPalette={openPalette}
      onOpenPreview={openPreview}
      onEditJobDetails={
        props.skipSetup ? () => setBasicsDrawerOpen(true) : undefined
      }
      onSaveDraft={saveDraftNow}
      onExit={handleExit}
      onPopOut={workspaceMode === "page" ? onPopOut : undefined}
      showExit={workspaceMode !== "modal"}
      autosaveStatus={autosaveStatus}
      lastSavedAt={lastSavedAt}
      sticky={workspaceMode !== "page"}
    />
  );

  const stepperBlock =
    workspaceMode !== "modal" ? (
      <QuoteStepper
        currentStep={step}
        maxReachedIndex={maxReachedIndex}
        editorMode={editorMode}
        onStepClick={goToStep}
        compact={workspaceMode === "page"}
      />
    ) : null;

  const totalsBlock = (
    <QuoteTotalsBar
      laborTotal={costBreakdown.laborTotal}
      materialsTotal={costBreakdown.materialsTotal}
      profitPct={costBreakdown.profitPct}
      quoteTotal={costBreakdown.displayTotal}
      tierLabel={costBreakdown.featuredTierLabel}
      compact={workspaceMode === "page"}
    />
  );

  const renderedStepPanel =
    workspaceMode === "modal" ? (
      <QuoteModalLayout
        currentStep={step}
        maxReachedIndex={maxReachedIndex}
        editorMode={editorMode}
        onStepClick={goToStep}
      >
        {stepPanel}
      </QuoteModalLayout>
    ) : (
      stepPanel
    );

  const wizardStepLabel =
    QUOTE_STEP_META.find((meta) => meta.id === step)?.label ?? "Edit";

  const workspaceOverlays = (
    <>
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="responsive" className="w-full p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border px-6 py-4 text-left">
            <SheetTitle>Customer preview</SheetTitle>
            <SheetDescription>
              Live view of what your customer sees on the portal
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto p-4 sm:p-6">
            <QuotePreviewPane
              quoteId={quoteId || "preview"}
              companyId={company.id}
              companyName={company.name}
              companyLogoUrl={company.logo_url}
              companyPhone={company.phone}
              companyEmail={company.email}
              customerName={selectedCustomer?.name ?? "Customer"}
              customerId={customerId}
              quoteName={quoteName || null}
              jobType={jobType}
              customMessage={customMessage || null}
              jobAddress={jobAddress}
              beforePhotos={beforePhotos}
              status={status}
              lineItems={lineItems}
              tierState={tierState}
              rooms={rooms}
              estimationMode={estimationMode}
              tierPaintConfig={QUOTE_PAINT_TIERS.map(
                (tier) => tierPaintConfig[tier],
              )}
              paintProducts={paintProducts}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AppDrawer
        open={basicsDrawerOpen}
        onOpenChange={setBasicsDrawerOpen}
        title="Job details"
        description="Customer, address, and job settings."
        footer={
          <Button
            className="w-full"
            type="button"
            onClick={() => setBasicsDrawerOpen(false)}
          >
            Done
          </Button>
        }
      >
        <BasicsStep
          customers={customers}
          customerId={customerId}
          onCustomerIdChange={setCustomerId}
          onCustomerCreated={addCustomer}
          jobType={jobType}
          onJobTypeChange={setJobType}
          estimationMode={estimationMode}
          onEstimationModeChange={setEstimationMode}
          jobAddress={jobAddress}
          onJobAddressChange={setJobAddress}
          beforePhotos={beforePhotos}
          onBeforePhotosChange={setBeforePhotos}
          quoteId={quoteId || undefined}
          selectedCustomer={selectedCustomer}
        />
      </AppDrawer>

      <AppDrawer
        open={roomDrawerOpen}
        onOpenChange={setRoomDrawerOpen}
        title={editingRoomIndex !== null ? "Colors & prep" : "Add Room"}
        description="Color codes, prep notes, and surface details."
        footer={
          <div className="flex w-full gap-2">
            <Button
              className="flex-1"
              variant="outline"
              type="button"
              onClick={() => setRoomDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" type="button" onClick={saveRoomDraft}>
              Save &amp; close
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Room Name</Label>
            <Input
              value={roomDraft.name}
              onChange={(e) =>
                setRoomDraft((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Living Room"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Surface Type</Label>
              <Select
                value={roomDraft.surface_type}
                onValueChange={(v) =>
                  setRoomDraft((prev) => ({ ...prev, surface_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drywall">Drywall</SelectItem>
                  <SelectItem value="plaster">Plaster</SelectItem>
                  <SelectItem value="wood">Wood</SelectItem>
                  <SelectItem value="brick">Brick</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={roomDraft.condition}
                onValueChange={(v) =>
                  setRoomDraft((prev) => ({ ...prev, condition: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Square Feet</Label>
              <Input
                type="number"
                value={roomDraft.sq_ft || ""}
                onChange={(e) =>
                  setRoomDraft((prev) => ({
                    ...prev,
                    sq_ft: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Coats</Label>
              <Input
                type="number"
                min={1}
                value={roomDraft.coats}
                onChange={(e) =>
                  setRoomDraft((prev) => ({
                    ...prev,
                    coats: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Estimated:{" "}
            <strong className="text-foreground">
              {estimateGallons(roomDraft.sq_ft, roomDraft.coats, coverage)}{" "}
              gallons
            </strong>
          </div>
          <div className="space-y-2">
            <Label>Color Codes</Label>
            <Input
              value={roomDraft.color_codes}
              onChange={(e) =>
                setRoomDraft((prev) => ({
                  ...prev,
                  color_codes: e.target.value,
                }))
              }
              placeholder="SW 7008, BM OC-17"
            />
          </div>
          <div className="space-y-2">
            <Label>Prep Work</Label>
            <Textarea
              value={roomDraft.prep_work}
              onChange={(e) =>
                setRoomDraft((prev) => ({ ...prev, prep_work: e.target.value }))
              }
              rows={3}
            />
          </div>
        </div>
      </AppDrawer>

      <AppDrawer
        open={lineItemDrawerOpen}
        onOpenChange={setLineItemDrawerOpen}
        title={editingLineItemIndex !== null ? "Edit Line Item" : "Add Line Item"}
        description="Labor, materials, or extra charges."
        footer={
          <div className="flex w-full gap-2">
            <Button
              className="flex-1"
              variant="outline"
              type="button"
              onClick={() => setLineItemDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" type="button" onClick={saveLineItemDraft}>
              Save &amp; close
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={lineItemDraft.type}
              onValueChange={(v) =>
                setLineItemDraft((prev) => ({
                  ...prev,
                  type: v as LineItemType,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="extra">Extra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={lineItemDraft.description}
              onChange={(e) =>
                setLineItemDraft((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Interior wall painting"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Qty</Label>
              <Input
                type="number"
                value={lineItemDraft.qty}
                onChange={(e) =>
                  setLineItemDraft((prev) => ({
                    ...prev,
                    qty: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost</Label>
              <Input
                type="number"
                value={lineItemDraft.unit_cost}
                onChange={(e) =>
                  setLineItemDraft((prev) => ({
                    ...prev,
                    unit_cost: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Markup %</Label>
              <Input
                type="number"
                value={lineItemDraft.markup}
                onChange={(e) =>
                  setLineItemDraft((prev) => ({
                    ...prev,
                    markup: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        </div>
      </AppDrawer>
    </>
  );

  const documentWizardPanel =
    workspaceMode === "document" ? (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-border/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Wizard
          </p>
          <p className="font-semibold text-foreground">{wizardStepLabel}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {renderedStepPanel}
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
    ) : null;

  if (workspaceMode === "document") {
    return (
      <div className="quote-document-workspace-root flex h-full min-h-0 flex-1 flex-col">
        <QuoteDocumentLayout
          quoteId={quoteId || "draft"}
          companyId={company.id}
          customerId={customerId}
          quoteName={quoteName || null}
          jobType={jobType}
          customMessage={customMessage || null}
          jobAddress={jobAddress}
          beforePhotos={beforePhotos}
          status={status}
          tierState={tierState}
          lineItems={lineItems}
          rooms={rooms}
          estimationMode={estimationMode}
          tierPaintConfig={QUOTE_PAINT_TIERS.map((tier) => tierPaintConfig[tier])}
          paintProducts={paintProducts}
          companyName={company.name}
          companyLogoUrl={company.logo_url}
          companyPhone={company.phone}
          companyEmail={company.email}
          customerName={selectedCustomer?.name}
          currentStep={step}
          maxReachedIndex={maxReachedIndex}
          editorMode={editorMode}
          isPending={isPending}
          isEditable={isEditable}
          autosaveStatus={autosaveStatus}
          lastSavedAt={lastSavedAt}
          onExit={handleExit}
          onStepClick={goToStep}
          onNext={handleNext}
          onBack={handleBack}
          onSend={handleSendQuote}
          onEditCustomer={() => goToStep("setup")}
          onEditSite={() =>
            props.skipSetup ? setBasicsDrawerOpen(true) : goToStep("setup")
          }
          onEditAreas={() => goToStep("estimator")}
          onEditPaint={() => goToStep("paint-options")}
          onEditPackages={() => goToStep("tiers")}
          onEditMessage={() => goToStep("polish")}
          onAddArea={() => {
            goToStep("estimator");
            addAreaByName("New Area");
          }}
          wizardPanel={documentWizardPanel}
        />

        <QuoteEditorOnboarding mode={onboardingMode} onDismiss={dismissOnboarding} />

        <QuoteCommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          currentStep={step}
          editorMode={editorMode}
          maxReachedIndex={maxReachedIndex}
          onGoToStep={goToStep}
          onAddArea={addAreaByName}
          onDuplicateArea={() => duplicateArea(selectedAreaIndex)}
          onRegenerateAll={generateFromRooms}
          onSave={saveDraftNow}
          onNext={handleNext}
          onOpenPreview={openPreview}
          onSaveAsTemplate={() => setTemplateDialogOpen(true)}
          onEditorModeChange={handleEditorModeChange}
          onApplyPaintDefaults={applyCompanyPaintDefaults}
          onOpenPaintLibrary={() => {
            window.open(
              "/app/settings?tab=paint-library",
              "_blank",
              "noopener,noreferrer",
            );
          }}
        />

        <SaveQuoteTemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          draft={getDraft()}
          jobType={jobType}
          quoteId={quoteId || undefined}
          defaultName={quoteName || `${selectedCustomer?.name ?? "Job"} template`}
        />

        <QuoteUnsavedPrompt
          open={pageExitPromptOpen}
          isSaving={autosaveStatus === "saving"}
          onKeepEditing={() => setPageExitPromptOpen(false)}
          onDiscard={async () => {
            setPageExitPromptOpen(false);
            await leaveWorkspace();
          }}
          onSaveAndClose={handleSaveAndExit}
        />

        {workspaceOverlays}
      </div>
    );
  }

  return (
    <div
      className={
        workspaceMode === "page"
          ? "quote-editor-page"
          : "space-y-6 pb-28 lg:pb-6"
      }
    >
      {workspaceMode === "page" ? (
        <>
          <div className="shrink-0 space-y-2 border-b border-border/60 pb-2">
            {headerBlock}
            {stepperBlock}
            {statusBanner}
            {totalsBlock}
          </div>

          <div className="quote-editor-workspace">
            <div
              className={
                step === "estimator"
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                  : "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
              }
            >
              {renderedStepPanel}
              {error ? (
                <p
                  role="alert"
                  className="mt-3 shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          {stepFooter}
        </>
      ) : (
        <>
          {headerBlock}
          {workspaceMode !== "modal" ? (
            <div className="hidden md:block">{stepperBlock}</div>
          ) : null}
          {statusBanner}
          {totalsBlock}
          {renderedStepPanel}
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          {stepFooter}
        </>
      )}

      <QuoteEditorOnboarding mode={onboardingMode} onDismiss={dismissOnboarding} />

      <QuoteCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        currentStep={step}
        editorMode={editorMode}
        maxReachedIndex={maxReachedIndex}
        onGoToStep={goToStep}
        onAddArea={addAreaByName}
        onDuplicateArea={() => duplicateArea(selectedAreaIndex)}
        onRegenerateAll={generateFromRooms}
        onSave={saveDraftNow}
        onNext={handleNext}
        onOpenPreview={openPreview}
        onSaveAsTemplate={() => setTemplateDialogOpen(true)}
        onEditorModeChange={handleEditorModeChange}
        onApplyPaintDefaults={applyCompanyPaintDefaults}
        onOpenPaintLibrary={() => {
          window.open(
            "/app/settings?tab=paint-library",
            "_blank",
            "noopener,noreferrer",
          );
        }}
      />

      <SaveQuoteTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        draft={getDraft()}
        jobType={jobType}
        quoteId={quoteId || undefined}
        defaultName={quoteName || `${selectedCustomer?.name ?? "Job"} template`}
      />

      {workspaceOverlays}

      {workspaceMode === "page" ? (
        <QuoteUnsavedPrompt
          open={pageExitPromptOpen}
          isSaving={autosaveStatus === "saving"}
          onKeepEditing={() => setPageExitPromptOpen(false)}
          onDiscard={async () => {
            setPageExitPromptOpen(false);
            await leaveWorkspace();
          }}
          onSaveAndClose={handleSaveAndExit}
        />
      ) : null}
    </div>
  );
}
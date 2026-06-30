"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchCompanyEstimateDefaults,
  saveCompanyEstimateDefaults,
} from "@/app/app/(portal)/quotes/estimate-defaults-actions";
import { listCompanyPaintProducts } from "@/app/app/(portal)/paint-library/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  goodTierPaintFromBaselineForScope,
  normalizeBaselinePaintSystems,
  type BaselineApplicationScope,
  type BaselinePaintSystemInput,
  type BaselineSurfaceCategory,
} from "@/lib/quotes/baseline-paint";
import {
  companyEstimateDefaultsToInput,
  serializeCompanyEstimateDefaultsForCompare,
  type CompanyEstimateDefaults,
} from "@/lib/quotes/company-estimate-defaults";
import {
  type CompanyPaintProductRow,
  type TierPaintConfigInput,
} from "@/lib/paint-library/types";
import { EstimateDefaultsMainTabs } from "@/components/quotes/estimate-defaults/EstimateDefaultsMainTabs";
import { LaborProductionTab } from "@/components/quotes/estimate-defaults/LaborProductionTab";
import { ProductPricingTab } from "@/components/quotes/estimate-defaults/ProductPricingTab";
import { ProductsPackagesTab } from "@/components/quotes/estimate-defaults/ProductsPackagesTab";
import {
  clampWizardStepIndex,
  ESTIMATE_DEFAULTS_WIZARD_STEPS,
  firstWizardStepIndexForMainTab,
  type EstimateDefaultsMainTab,
  type LaborProductionSubTab,
  type LaborProductionSurfaceSubTab,
  wizardStepIdForLaborSubTab,
  wizardStepIdForProductsScope,
  wizardStepIndex as indexOfWizardStep,
} from "@/lib/quotes/estimate-defaults-wizard-steps";
import { QuoteUnsavedPrompt } from "@/components/quotes/QuoteUnsavedPrompt";
import { cn } from "@/lib/utils";


type QuoteEstimateDefaultsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function QuoteEstimateDefaultsModal({
  open,
  onOpenChange,
  onSaved,
}: QuoteEstimateDefaultsModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [products, setProducts] = useState<CompanyPaintProductRow[]>([]);
  const [state, setState] = useState<CompanyEstimateDefaults | null>(null);
  const [wizardStepIndex, setWizardStepIndex] = useState(0);
  const savedStateRef = useRef<CompanyEstimateDefaults | null>(null);
  const hasLoadedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const wizardSteps = ESTIMATE_DEFAULTS_WIZARD_STEPS;
  const currentWizardStep = wizardSteps[wizardStepIndex];
  const isFirstWizardStep = wizardStepIndex === 0;
  const isLastWizardStep = wizardStepIndex === wizardSteps.length - 1;

  const goToWizardStep = useCallback((index: number) => {
    setWizardStepIndex(clampWizardStepIndex(index));
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goBack = useCallback(() => {
    goToWizardStep(wizardStepIndex - 1);
  }, [goToWizardStep, wizardStepIndex]);

  const goNext = useCallback(() => {
    goToWizardStep(wizardStepIndex + 1);
  }, [goToWizardStep, wizardStepIndex]);

  const goToMainTab = useCallback(
    (tab: EstimateDefaultsMainTab) => {
      goToWizardStep(firstWizardStepIndexForMainTab(tab));
    },
    [goToWizardStep],
  );

  const goToLaborSubTab = useCallback(
    (subTab: LaborProductionSubTab) => {
      goToWizardStep(indexOfWizardStep(wizardStepIdForLaborSubTab(subTab)));
    },
    [goToWizardStep],
  );

  const goToProductsScope = useCallback(
    (scope: BaselineApplicationScope) => {
      goToWizardStep(indexOfWizardStep(wizardStepIdForProductsScope(scope)));
    },
    [goToWizardStep],
  );

  const applyLoadedDefaults = useCallback((loaded: CompanyEstimateDefaults) => {
    const cloned = structuredClone(loaded);
    setState(cloned);
    savedStateRef.current = structuredClone(cloned);
    setSavedSnapshot(serializeCompanyEstimateDefaultsForCompare(cloned));
  }, []);

  const reload = useCallback(async () => {
    try {
      const [defaultsResult, productsResult] = await Promise.all([
        fetchCompanyEstimateDefaults(),
        listCompanyPaintProducts(),
      ]);
      if (defaultsResult.success && defaultsResult.data) {
        applyLoadedDefaults(defaultsResult.data);
        hasLoadedRef.current = true;
      } else if (!defaultsResult.success) {
        toast.error(defaultsResult.error);
      }
      if (productsResult.success) {
        setProducts(productsResult.data);
      } else if (!productsResult.success) {
        toast.error(productsResult.error);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load estimate defaults",
      );
    }
  }, [applyLoadedDefaults]);

  useEffect(() => {
    if (!open) return;
    setUnsavedPromptOpen(false);
    setWizardStepIndex(0);
    if (hasLoadedRef.current) return;
    void reload();
  }, [open, reload]);

  const isDirty = useMemo(() => {
    if (!savedSnapshot || !state) return false;
    return serializeCompanyEstimateDefaultsForCompare(state) !== savedSnapshot;
  }, [state, savedSnapshot]);

  const isReady = state !== null && savedSnapshot !== null;

  const requestClose = useCallback(() => {
    if (isSaving) return;
    if (isDirty) {
      setUnsavedPromptOpen(true);
      return;
    }
    onOpenChange(false);
  }, [isDirty, isSaving, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (unsavedPromptOpen) {
        setUnsavedPromptOpen(false);
        return;
      }
      requestClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, requestClose, unsavedPromptOpen]);

  const updateBaseline = (
    scope: BaselineApplicationScope,
    category: BaselineSurfaceCategory,
    patch: Partial<BaselinePaintSystemInput>,
  ) => {
    setState((prev) => {
      if (!prev) return prev;
      const nextBaselineSystems = normalizeBaselinePaintSystems(
        prev.baselineSystems,
        "both",
      ).map((row) =>
        row.application_scope === scope && row.surface_category === category
          ? { ...row, ...patch }
          : row,
      );

      if (category !== "wall") {
        return { ...prev, baselineSystems: nextBaselineSystems };
      }

      const goodPatch = goodTierPaintFromBaselineForScope(
        nextBaselineSystems,
        scope,
      );

      return {
        ...prev,
        baselineSystems: nextBaselineSystems,
        tierDefaultsByScope: {
          ...prev.tierDefaultsByScope,
          [scope]: {
            ...prev.tierDefaultsByScope[scope],
            good: {
              ...prev.tierDefaultsByScope[scope].good,
              ...goodPatch,
              tier: "good",
              labor_hours_delta_pct: 0,
            },
          },
        },
      };
    });
  };

  const updateTier = (
    scope: BaselineApplicationScope,
    tier: TierPaintConfigInput["tier"],
    patch: Partial<TierPaintConfigInput>,
  ) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tierDefaultsByScope: {
          ...prev.tierDefaultsByScope,
          [scope]: {
            ...prev.tierDefaultsByScope[scope],
            [tier]: { ...prev.tierDefaultsByScope[scope][tier], ...patch },
          },
        },
      };
    });
  };

  const commitSavedState = useCallback((next: CompanyEstimateDefaults) => {
    const cloned = structuredClone(next);
    savedStateRef.current = structuredClone(cloned);
    setSavedSnapshot(serializeCompanyEstimateDefaultsForCompare(cloned));
  }, []);

  const handleSave = async (options?: { closeAfter?: boolean }): Promise<boolean> => {
    if (isSaving || !state) return false;
    setIsSaving(true);
    try {
      const result = await saveCompanyEstimateDefaults(
        companyEstimateDefaultsToInput(state),
      );
      if (!result.success) {
        toast.error(result.error);
        return false;
      }
      toast.success("Estimate defaults saved");
      commitSavedState(state);
      onSaved?.();
      if (options?.closeAfter) {
        setUnsavedPromptOpen(false);
        onOpenChange(false);
      }
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save estimate defaults",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (savedStateRef.current) {
      setState(structuredClone(savedStateRef.current));
    }
    setUnsavedPromptOpen(false);
    onOpenChange(false);
  };

  const handlePromptSaveAndClose = async () => {
    await handleSave({ closeAfter: true });
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else requestClose();
      }}
    >
      <DialogContent
        className="left-[50%] top-[3vh] flex h-[min(94vh,960px)] w-[min(96vw,1200px)] max-w-none -translate-x-1/2 translate-y-0 flex-col gap-0 overflow-hidden p-0"
        onInteractOutside={(event) => {
          event.preventDefault();
          requestClose();
        }}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (unsavedPromptOpen) {
            setUnsavedPromptOpen(false);
            return;
          }
          requestClose();
        }}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 shrink-0" />
            Estimate defaults
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">
              Labor cost, default margin, production rates, and package systems.
              Quotes use at-cost materials and labor, then overhead and your
              target gross margin for the selling price.
            </span>
            <span
              className={cn(
                "block min-h-[1.25rem] text-sm font-medium text-amber-600 dark:text-amber-400",
                !isDirty && "invisible",
              )}
              aria-hidden={!isDirty}
            >
              Unsaved changes
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-border/60 px-6 py-4">
          {currentWizardStep ? (
            <EstimateDefaultsMainTabs
              currentStep={currentWizardStep}
              onMainTabChange={goToMainTab}
              onLaborSubTabChange={goToLaborSubTab}
              onProductsScopeChange={goToProductsScope}
            />
          ) : null}
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
        >
          {!isReady || !state || !currentWizardStep ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Loading your estimate defaults…
            </p>
          ) : currentWizardStep.id === "pricing" ? (
            <div
              className={cn(
                "rounded-lg transition-colors",
                "border border-primary/40 bg-primary/5 p-1 ring-1 ring-primary/20",
              )}
            >
              <ProductPricingTab
                state={state}
                onChange={(patch) =>
                  setState((prev) => (prev ? { ...prev, ...patch } : prev))
                }
              />
            </div>
          ) : currentWizardStep.id.startsWith("labor-") ? (
            <LaborProductionTab
              state={state}
              surfaceSubTab={
                currentWizardStep.id.replace(
                  "labor-",
                  "",
                ) as LaborProductionSurfaceSubTab
              }
              highlightActive
              onChange={(patch) =>
                setState((prev) => (prev ? { ...prev, ...patch } : prev))
              }
            />
          ) : (
            <div
              className={cn(
                "rounded-lg transition-colors",
                "border border-primary/40 bg-primary/5 p-1 ring-1 ring-primary/20",
              )}
            >
              <ProductsPackagesTab
                scope={
                  currentWizardStep.id === "products-exterior"
                    ? "exterior"
                    : "interior"
                }
                state={state}
                products={products}
                onSpotPrimeMaterialPctChange={(spotPrimeMaterialPct) =>
                  setState((prev) =>
                    prev ? { ...prev, spotPrimeMaterialPct } : prev,
                  )
                }
                onUpdateBaseline={updateBaseline}
                onUpdateTier={updateTier}
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={isSaving || isFirstWizardStep || !isReady}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            {currentWizardStep ? (
              <p className="text-xs text-muted-foreground">
                Step {wizardStepIndex + 1} of {wizardSteps.length}:{" "}
                <span className="font-medium text-foreground">
                  {currentWizardStep.label}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || !isReady || !isDirty}
            >
              {isSaving ? "Saving…" : "Save defaults"}
            </Button>
            <Button
              type="button"
              onClick={goNext}
              disabled={isSaving || !isReady || isLastWizardStep}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <QuoteUnsavedPrompt
      open={unsavedPromptOpen}
      isSaving={isSaving}
      title="Save estimate defaults?"
      description="You have unsaved changes to your estimate defaults. Save them before closing, discard your edits, or keep editing."
      saveLabel="Save & close"
      onKeepEditing={() => setUnsavedPromptOpen(false)}
      onDiscard={handleDiscard}
      onSaveAndClose={() => void handlePromptSaveAndClose()}
    />
    </>
  );
}

export function QuoteEstimateDefaultsButton({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" />
        Estimate defaults
      </Button>
      <QuoteEstimateDefaultsModal
        open={open}
        onOpenChange={setOpen}
        onSaved={onSaved}
      />
    </>
  );
}
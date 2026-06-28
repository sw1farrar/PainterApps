"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Home, Pencil, Settings2, Sun } from "lucide-react";
import { toast } from "sonner";
import { SellSheetBulkSelectionActions } from "@/components/sell-sheet/SellSheetBulkSelectionActions";
import { SellSheetEditorModal } from "@/components/sell-sheet/SellSheetEditorModal";
import { SellSheetFeatureCategoryManageModal } from "@/components/sell-sheet/SellSheetFeatureCategoryManageModal";
import {
  type BenefitLibrary,
  customItemsForCategoryAndScope,
} from "@/lib/sell-sheet/benefit-library";
import {
  SELL_SHEET_FEATURE_CATEGORIES,
  catalogItemsByCategory,
  filterVisibleCatalogItems,
  isCatalogFeature,
  type SellSheetFeatureCategoryId,
} from "@/lib/sell-sheet/feature-catalog";
import {
  clearAllPackageBenefits,
  getInheritedFeatures,
  selectAllCatalogFeatures,
  selectAllLibraryBenefits,
  setWorkmanshipWarranty,
  toggleCatalogFeature,
  toggleLibraryBenefit,
  tierOnlyBenefits,
} from "@/lib/sell-sheet/feature-selection";
import {
  BENEFITS_TIER_MAX,
  canAddDisplayBenefit,
  isBenefitsTierAtLimit,
} from "@/lib/sell-sheet/sell-sheet-limits";
import { SellSheetWarrantyLengthPicker } from "@/components/sell-sheet/SellSheetWarrantyLengthPicker";
import {
  featuresForDisplay,
  inheritedWorkmanshipWarrantyLabel,
  isWorkmanshipWarrantyLabel,
  selectedWorkmanshipWarrantyLabel,
} from "@/lib/sell-sheet/warranty-from-features";
import { useLanguage } from "@/providers/LanguageProvider";
import type {
  SellSheetApplicationType,
  SellSheetData,
  SellSheetTierKey,
} from "@/types/sell-sheet";

type SellSheetFeatureEditorLabels = {
  catalogHint: string;
  inheritedHint: string;
  catalogLegend: string;
  selectAll: string;
  clearAll: string;
  selectApplicationFirst: string;
  manageCategory: string;
  manageCategoryHint: string;
  includeInCatalog: string;
  scopeInterior: string;
  scopeExterior: string;
  categoryLabels: Record<
    (typeof SELL_SHEET_FEATURE_CATEGORIES)[number]["id"],
    string
  >;
  inputPlaceholder: string;
  addLabel: string;
  removeFromLibrary: string;
  duplicateItemError: string;
  packageOnlyFeaturesLegend: string;
  emptyHint: string;
  editLabel: string;
  doneLabel: string;
  moreItemsLabel: string;
  benefitsPageLimit: string;
  benefitsLimitReached: string;
  benefitsInheritedNote: string;
  benefitsClearedInheritedToast: string;
  warrantyLengthLegend: string;
  warrantyPeriodHint: string;
  warrantyLengthNone: string;
};

type SellSheetFeatureEditorProps = {
  id: string;
  label: string;
  tierKey: SellSheetTierKey;
  applicationType: SellSheetApplicationType | "";
  inheritedFeatures: string[];
  features: string[];
  benefitLibrary: BenefitLibrary;
  isLoggedIn: boolean;
  onBenefitLibraryChange: (library: BenefitLibrary) => void;
  onRemoveFromAllTiers: (label: string) => void;
  onChange: Dispatch<SetStateAction<SellSheetData>>;
  labels: SellSheetFeatureEditorLabels;
};

const PREVIEW_LIMIT = 3;

export function SellSheetFeatureEditor({
  id,
  label,
  tierKey,
  applicationType,
  inheritedFeatures,
  features,
  benefitLibrary,
  isLoggedIn,
  onBenefitLibraryChange,
  onRemoveFromAllTiers,
  onChange,
  labels,
}: SellSheetFeatureEditorProps) {
  const { locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [scopeView, setScopeView] = useState<SellSheetApplicationType>("interior");
  const [manageCategory, setManageCategory] =
    useState<SellSheetFeatureCategoryId | null>(null);
  const inheritedSet = new Set(inheritedFeatures);
  const selectedCatalog = new Set(features.filter(isCatalogFeature));
  const tierOnlyCustom = tierOnlyBenefits(features, benefitLibrary);
  const tierOwnedFeatures = featuresForDisplay(
    features.filter((feature) => !inheritedSet.has(feature)),
  );
  const inheritedDisplayFeatures = featuresForDisplay(
    features.filter((feature) => inheritedSet.has(feature)),
  );
  const previewFeatures = tierOwnedFeatures.slice(0, PREVIEW_LIMIT);
  const remainingCount = Math.max(tierOwnedFeatures.length - PREVIEW_LIMIT, 0);
  const benefitsAtLimit = isBenefitsTierAtLimit(features);
  const selectedWarrantyLabel = selectedWorkmanshipWarrantyLabel(
    features,
    locale,
  );
  const inheritedWarrantyLabel =
    inheritedWorkmanshipWarrantyLabel(inheritedFeatures);
  const hiddenCatalogIds = benefitLibrary.hiddenCatalogIds;

  useEffect(() => {
    if (!open) return;
    if (applicationType === "interior" || applicationType === "exterior") {
      setScopeView(applicationType);
    }
  }, [open, applicationType]);

  const notifyBenefitsLimit = () => {
    toast.error(
      labels.benefitsLimitReached.replace("{max}", String(BENEFITS_TIER_MAX)),
    );
  };

  const clearPackageBenefits = () => {
    onChange((prev) => {
      const inheritedBenefits = featuresForDisplay(
        getInheritedFeatures(prev, tierKey),
      );
      const next = clearAllPackageBenefits(prev, tierKey);
      if (inheritedBenefits.length > 0) {
        toast.message(labels.benefitsClearedInheritedToast);
      }
      return next;
    });
  };

  const tryToggleBenefit = (label: string, selected: boolean) => {
    if (selected && !canAddDisplayBenefit(features, label)) {
      notifyBenefitsLimit();
      return;
    }

    onChange((prev) => {
      const tier = prev.tiers.find((entry) => entry.key === tierKey);
      const current = tier?.features ?? [];
      if (selected && !canAddDisplayBenefit(current, label)) {
        return prev;
      }

      return toggleCatalogFeature(prev, tierKey, label, selected);
    });
  };

  const tryToggleLibraryBenefit = (label: string, selected: boolean) => {
    if (selected && !canAddDisplayBenefit(features, label)) {
      notifyBenefitsLimit();
      return;
    }

    onChange((prev) =>
      toggleLibraryBenefit(prev, tierKey, label, selected),
    );
  };

  const removeTierOnlyCustom = (feature: string) => {
    onChange((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) =>
        tier.key === tierKey
          ? {
              ...tier,
              features: tier.features.filter((entry) => entry !== feature),
            }
          : tier,
      ),
    }));
  };

  const scopeLabel =
    scopeView === "interior" ? labels.scopeInterior : labels.scopeExterior;

  const visibleCatalogForScope = (categoryId: SellSheetFeatureCategoryId) =>
    filterVisibleCatalogItems(
      catalogItemsByCategory(categoryId, locale).filter(
        (item) => !isWorkmanshipWarrantyLabel(item.label),
      ),
      scopeView,
      hiddenCatalogIds,
    );

  const customForScope = (categoryId: SellSheetFeatureCategoryId) =>
    customItemsForCategoryAndScope(benefitLibrary, categoryId, scopeView);

  const hasVisibleBenefitsInScope = SELL_SHEET_FEATURE_CATEGORIES.some(
    (category) =>
      visibleCatalogForScope(category.id).length > 0 ||
      customForScope(category.id).length > 0,
  );

  const selectAllForScope = () => {
    onChange((prev) => {
      let next = selectAllCatalogFeatures(prev, tierKey, locale, {
        applicationType: scopeView,
        hiddenCatalogIds,
      });
      next = selectAllLibraryBenefits(next, tierKey, benefitLibrary, scopeView);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="form-section-title">{label}</p>
          <p className="mt-1 text-sm text-silver-600">
            {tierOwnedFeatures.length > 0
              ? labels.benefitsPageLimit
                  .replace("{selected}", String(tierOwnedFeatures.length))
                  .replace("{max}", String(BENEFITS_TIER_MAX))
              : inheritedDisplayFeatures.length > 0
                ? labels.benefitsInheritedNote.replace(
                    "{count}",
                    String(inheritedDisplayFeatures.length),
                  )
                : labels.emptyHint}
          </p>

          {previewFeatures.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {previewFeatures.map((feature) => (
                <li
                  key={feature}
                  className="truncate text-sm text-navy-800"
                  title={feature}
                >
                  {feature}
                </li>
              ))}
              {remainingCount > 0 ? (
                <li className="text-xs font-medium text-silver-500">
                  {labels.moreItemsLabel.replace(
                    "{count}",
                    String(remainingCount),
                  )}
                </li>
              ) : null}
            </ul>
          ) : inheritedDisplayFeatures.length > 0 ? (
            <p className="mt-2 text-xs font-medium text-blue-600">
              {labels.benefitsInheritedNote.replace(
                "{count}",
                String(inheritedDisplayFeatures.length),
              )}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-outline-dark inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm"
        >
          <Pencil className="h-4 w-4" />
          {labels.editLabel}
        </button>
      </div>

      <SellSheetEditorModal
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        subtitle={`${labels.catalogHint.replace("{max}", String(BENEFITS_TIER_MAX))} ${labels.benefitsPageLimit.replace("{selected}", String(tierOwnedFeatures.length)).replace("{max}", String(BENEFITS_TIER_MAX))}`}
        doneLabel={labels.doneLabel}
      >
        <div className="mx-auto w-full max-w-md">
          <p className="text-center text-xs font-bold uppercase tracking-wide text-silver-500">
            {labels.catalogLegend}
          </p>
          <div
            className="mx-auto mt-3 grid max-w-sm grid-cols-2 gap-2"
            role="radiogroup"
            aria-label={labels.catalogLegend}
          >
            {(
              [
                { value: "interior" as const, icon: Home, label: labels.scopeInterior },
                { value: "exterior" as const, icon: Sun, label: labels.scopeExterior },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const selected = scopeView === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setScopeView(option.value)}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                    selected
                      ? "border-blue-500/40 bg-gradient-to-br from-blue-50 to-white text-blue-800 shadow-sm ring-1 ring-blue-500/20"
                      : "border-silver-300/80 bg-white text-navy-800 hover:border-blue-500/25 hover:bg-blue-50/40"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${selected ? "text-blue-600" : "text-silver-500"}`}
                    strokeWidth={2.25}
                  />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <SellSheetWarrantyLengthPicker
          id={`${id}-warranty-length`}
          legend={labels.warrantyLengthLegend}
          hint={labels.warrantyPeriodHint}
          noneLabel={labels.warrantyLengthNone}
          inheritedHint={labels.inheritedHint}
          selectedLabel={selectedWarrantyLabel}
          inheritedLabel={inheritedWarrantyLabel}
          onChange={(label) =>
            onChange((prev) => setWorkmanshipWarranty(prev, tierKey, label))
          }
        />

        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-silver-500">
              {scopeLabel}
            </p>
            <SellSheetBulkSelectionActions
              selectAllLabel={labels.selectAll}
              clearAllLabel={labels.clearAll}
              onSelectAll={selectAllForScope}
              onClearAll={clearPackageBenefits}
            />
          </div>

          {!applicationType ? (
            <p className="rounded-md border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
              {labels.selectApplicationFirst}
            </p>
          ) : !hasVisibleBenefitsInScope ? (
            <p className="rounded-md border border-dashed border-silver-300/80 bg-silver-50/50 px-4 py-6 text-center text-sm text-silver-600">
              {labels.manageCategoryHint}
            </p>
          ) : null}

          {SELL_SHEET_FEATURE_CATEGORIES.map((category) => {
            const catalogItems = visibleCatalogForScope(category.id);
            const customItems = customForScope(category.id);

            return (
              <section key={category.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    {labels.categoryLabels[category.id]}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setManageCategory(category.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-silver-300/80 bg-white px-2.5 py-1 text-xs font-semibold text-navy-800 transition hover:border-blue-500/30 hover:bg-blue-50"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    {labels.manageCategory}
                  </button>
                </div>

                {catalogItems.length > 0 || customItems.length > 0 ? (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {catalogItems.map((item) => {
                      const checked = selectedCatalog.has(item.label);
                      const inherited = inheritedSet.has(item.label);
                      const limitBlocked =
                        benefitsAtLimit && !checked && !inherited;
                      const checkboxId = `${id}-${scopeView}-${item.id}`;

                      return (
                        <li key={item.id}>
                          <label
                            htmlFor={checkboxId}
                            className={`flex h-full items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm transition ${
                              inherited || limitBlocked
                                ? "cursor-default border-blue-200/80 bg-blue-50/60 text-navy-800"
                                : checked
                                  ? "cursor-pointer border-blue-500/30 bg-blue-50/40 text-navy-800"
                                  : "cursor-pointer border-silver-300/80 bg-white/90 text-navy-800 hover:border-blue-500/20 hover:bg-silver-50"
                            }`}
                          >
                            <input
                              id={checkboxId}
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-silver-400 text-blue-600 focus:ring-blue-500"
                              checked={checked}
                              disabled={inherited || limitBlocked}
                              onChange={(event) => {
                                tryToggleBenefit(
                                  item.label,
                                  event.target.checked,
                                );
                              }}
                            />
                            <span className="min-w-0 flex-1 leading-snug">
                              {item.label}
                              {inherited ? (
                                <span className="mt-0.5 block text-xs font-medium text-blue-600">
                                  {labels.inheritedHint}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}

                    {customItems.map((item) => {
                      const checked = features.includes(item.label);
                      const limitBlocked = benefitsAtLimit && !checked;
                      const checkboxId = `${id}-library-${scopeView}-${item.label}`;

                      return (
                        <li key={item.label}>
                          <label
                            htmlFor={checkboxId}
                            className={`flex h-full items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm transition ${
                              limitBlocked
                                ? "cursor-default border-silver-300/80 bg-white/90 text-navy-800"
                                : checked
                                  ? "cursor-pointer border-blue-500/30 bg-blue-50/40 text-navy-800"
                                  : "cursor-pointer border-silver-300/80 bg-white/90 text-navy-800 hover:border-blue-500/20 hover:bg-silver-50"
                            }`}
                          >
                            <input
                              id={checkboxId}
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-silver-400 text-blue-600 focus:ring-blue-500"
                              checked={checked}
                              disabled={limitBlocked}
                              onChange={(event) => {
                                tryToggleLibraryBenefit(
                                  item.label,
                                  event.target.checked,
                                );
                              }}
                            />
                            <span className="min-w-0 flex-1 leading-snug">
                              {item.label}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-silver-500">
                    {labels.manageCategoryHint}
                  </p>
                )}
              </section>
            );
          })}

          {tierOnlyCustom.length > 0 ? (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-silver-500">
                {labels.packageOnlyFeaturesLegend}
              </h3>
              <ul className="mt-3 space-y-2">
                {tierOnlyCustom.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 rounded-lg border border-silver-300/80 bg-white px-3 py-2 text-sm text-navy-800"
                  >
                    <span className="min-w-0 flex-1">{feature}</span>
                    <button
                      type="button"
                      onClick={() => removeTierOnlyCustom(feature)}
                      className="shrink-0 rounded p-1 text-silver-500 transition hover:bg-silver-100 hover:text-navy-800"
                      aria-label={`Remove ${feature}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </SellSheetEditorModal>

      {manageCategory ? (
        <SellSheetFeatureCategoryManageModal
          open={Boolean(manageCategory)}
          onClose={() => setManageCategory(null)}
          categoryId={manageCategory}
          categoryLabel={labels.categoryLabels[manageCategory]}
          scopeView={scopeView}
          scopeLabel={scopeLabel}
          benefitLibrary={benefitLibrary}
          isLoggedIn={isLoggedIn}
          onBenefitLibraryChange={onBenefitLibraryChange}
          onRemoveFromAllTiers={onRemoveFromAllTiers}
          labels={{
            doneLabel: labels.doneLabel,
            includeInCatalog: labels.includeInCatalog,
            inputPlaceholder: labels.inputPlaceholder,
            addLabel: labels.addLabel,
            removeFromLibrary: labels.removeFromLibrary,
            duplicateItemError: labels.duplicateItemError,
            manageHint: labels.manageCategoryHint,
          }}
        />
      ) : null}
    </div>
  );
}
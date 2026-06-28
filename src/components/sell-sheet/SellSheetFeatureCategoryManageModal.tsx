"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SellSheetEditorModal } from "@/components/sell-sheet/SellSheetEditorModal";
import {
  type BenefitLibrary,
  addLocalLibraryItem,
  customItemsForCategoryAndScope,
  removeLocalLibraryItem,
} from "@/lib/sell-sheet/benefit-library";
import {
  addBenefitLibraryItem,
  hideCatalogBenefitItem,
  removeBenefitLibraryItem,
  unhideCatalogBenefitItem,
} from "@/lib/sell-sheet/library-actions";
import {
  catalogItemsByCategory,
  filterCatalogItemsByScope,
  isCatalogItemVisible,
  type SellSheetFeatureCategoryId,
} from "@/lib/sell-sheet/feature-catalog";
import { isWorkmanshipWarrantyLabel } from "@/lib/sell-sheet/warranty-from-features";
import { useLanguage } from "@/providers/LanguageProvider";
import type { SellSheetApplicationType } from "@/types/sell-sheet";

type SellSheetFeatureCategoryManageModalLabels = {
  doneLabel: string;
  includeInCatalog: string;
  inputPlaceholder: string;
  addLabel: string;
  removeFromLibrary: string;
  duplicateItemError: string;
  manageHint: string;
};

type SellSheetFeatureCategoryManageModalProps = {
  open: boolean;
  onClose: () => void;
  categoryId: SellSheetFeatureCategoryId;
  categoryLabel: string;
  scopeView: SellSheetApplicationType;
  scopeLabel: string;
  benefitLibrary: BenefitLibrary;
  isLoggedIn: boolean;
  onBenefitLibraryChange: (library: BenefitLibrary) => void;
  onRemoveFromAllTiers: (label: string) => void;
  labels: SellSheetFeatureCategoryManageModalLabels;
};

export function SellSheetFeatureCategoryManageModal({
  open,
  onClose,
  categoryId,
  categoryLabel,
  scopeView,
  scopeLabel,
  benefitLibrary,
  isLoggedIn,
  onBenefitLibraryChange,
  onRemoveFromAllTiers,
  labels,
}: SellSheetFeatureCategoryManageModalProps) {
  const { locale } = useLanguage();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const hiddenCatalogIds = benefitLibrary.hiddenCatalogIds;

  const catalogItems = filterCatalogItemsByScope(
    catalogItemsByCategory(categoryId, locale).filter(
      (item) => !isWorkmanshipWarrantyLabel(item.label),
    ),
    scopeView,
  );

  const customItems = customItemsForCategoryAndScope(
    benefitLibrary,
    categoryId,
    scopeView,
  );

  const setCatalogIncluded = async (catalogId: string, included: boolean) => {
    if (busy) return;

    if (isLoggedIn) {
      setBusy(true);
      const result = included
        ? await unhideCatalogBenefitItem(catalogId)
        : await hideCatalogBenefitItem(catalogId);
      setBusy(false);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onBenefitLibraryChange(result.library);
      return;
    }

    const nextHidden = included
      ? hiddenCatalogIds.filter((id) => id !== catalogId)
      : hiddenCatalogIds.includes(catalogId)
        ? hiddenCatalogIds
        : [...hiddenCatalogIds, catalogId];

    onBenefitLibraryChange({
      ...benefitLibrary,
      hiddenCatalogIds: nextHidden,
    });
  };

  const addCustomItem = async () => {
    const label = draft.trim();
    if (!label || busy) return;

    if (isLoggedIn) {
      setBusy(true);
      const result = await addBenefitLibraryItem(label, categoryId, scopeView);
      setBusy(false);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onBenefitLibraryChange(result.library);
      setDraft("");
      return;
    }

    const next = addLocalLibraryItem(benefitLibrary, {
      label,
      category: categoryId,
      scope: scopeView,
    });

    if ("error" in next) {
      toast.error(
        next.error === "That item is already in your library."
          ? labels.duplicateItemError
          : next.error,
      );
      return;
    }

    onBenefitLibraryChange(next);
    setDraft("");
  };

  const removeCustomItem = async (label: string) => {
    if (busy) return;

    if (isLoggedIn) {
      setBusy(true);
      const result = await removeBenefitLibraryItem(label);
      setBusy(false);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onBenefitLibraryChange(result.library);
      onRemoveFromAllTiers(label);
      return;
    }

    onBenefitLibraryChange(removeLocalLibraryItem(benefitLibrary, label));
    onRemoveFromAllTiers(label);
  };

  return (
    <SellSheetEditorModal
      open={open}
      onClose={onClose}
      title={`${categoryLabel} — ${scopeLabel}`}
      subtitle={labels.manageHint}
      doneLabel={labels.doneLabel}
    >
      <ul className="space-y-2">
        {catalogItems.map((item) => {
          const included = isCatalogItemVisible(item.id, hiddenCatalogIds);
          const checkboxId = `manage-catalog-${categoryId}-${item.id}`;

          return (
            <li key={item.id}>
              <label
                htmlFor={checkboxId}
                className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm transition ${
                  included
                    ? "border-blue-500/30 bg-blue-50/40 text-navy-800"
                    : "border-silver-300/80 bg-white/90 text-silver-600"
                }`}
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-silver-400 text-blue-600 focus:ring-blue-500"
                  checked={included}
                  disabled={busy}
                  onChange={(event) => {
                    void setCatalogIncluded(item.id, event.target.checked);
                  }}
                />
                <span className="min-w-0 flex-1 leading-snug">
                  {item.label}
                  {!included ? (
                    <span className="mt-0.5 block text-xs text-silver-500">
                      {labels.includeInCatalog}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}

        {customItems.map((item) => (
          <li key={`custom-${item.label}`}>
            <div className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-50/30 px-3 py-2.5 text-sm text-navy-800">
              <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
              <button
                type="button"
                onClick={() => void removeCustomItem(item.label)}
                disabled={busy}
                className="shrink-0 rounded p-0.5 text-silver-500 transition hover:bg-silver-100 hover:text-red-600 disabled:opacity-50"
                aria-label={labels.removeFromLibrary}
                title={labels.removeFromLibrary}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex gap-2 border-t border-silver-300/60 pt-5">
        <input
          type="text"
          className="form-input min-w-0 flex-1"
          placeholder={labels.inputPlaceholder}
          value={draft}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void addCustomItem();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void addCustomItem()}
          disabled={busy || !draft.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {labels.addLabel}
        </button>
      </div>
    </SellSheetEditorModal>
  );
}
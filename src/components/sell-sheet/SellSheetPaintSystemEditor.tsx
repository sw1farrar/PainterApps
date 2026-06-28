"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SellSheetBulkSelectionActions } from "@/components/sell-sheet/SellSheetBulkSelectionActions";
import { SellSheetEditorModal } from "@/components/sell-sheet/SellSheetEditorModal";
import {
  addPaintSystemLibraryItem,
  removePaintSystemLibraryItem,
} from "@/lib/sell-sheet/library-actions";
import {
  canAddPaintSystemFeature,
  canAddPaintSystemOption,
  enforcePaintSystemLimit,
  mergePaintSystemOptionLists,
  PAINT_SYSTEM_OPTIONS_MAX,
  PAINT_SYSTEM_TIER_MAX,
  paintSystemSelectablePool,
} from "@/lib/sell-sheet/sell-sheet-limits";
import { updateTier } from "@/lib/sell-sheet/utils";
import type { SellSheetData, SellSheetTierKey } from "@/types/sell-sheet";

type SellSheetPaintSystemEditorProps = {
  id: string;
  label: string;
  hint: string;
  tierKey: SellSheetTierKey;
  featureOptions: string[];
  selectedFeatures: string[];
  paintSystemLibrary: string[];
  isLoggedIn: boolean;
  onPaintSystemLibraryChange: (library: string[]) => void;
  onChange: Dispatch<SetStateAction<SellSheetData>>;
  addLabel: string;
  inputPlaceholder: string;
  emptyHint: string;
  editLabel: string;
  doneLabel: string;
  moreItemsLabel: string;
  optionsLegend: string;
  optionsHint: string;
  libraryLegend: string;
  libraryHint: string;
  signInForLibrary: string;
  selectAll: string;
  clearAll: string;
  addToLibrary: string;
  removeFromLibrary: string;
  paintSystemPageLimit: string;
  paintSystemLimitReached: string;
  paintSystemOptionsLimitReached: string;
};

const PREVIEW_LIMIT = 3;

export function SellSheetPaintSystemEditor({
  id,
  label,
  hint,
  tierKey,
  featureOptions,
  selectedFeatures,
  paintSystemLibrary,
  isLoggedIn,
  onPaintSystemLibraryChange,
  onChange,
  addLabel,
  inputPlaceholder,
  emptyHint,
  editLabel,
  doneLabel,
  moreItemsLabel,
  optionsLegend,
  optionsHint,
  libraryLegend,
  libraryHint,
  signInForLibrary,
  selectAll,
  clearAll,
  addToLibrary,
  removeFromLibrary,
  paintSystemPageLimit,
  paintSystemLimitReached,
  paintSystemOptionsLimitReached,
}: SellSheetPaintSystemEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [libraryBusy, setLibraryBusy] = useState(false);

  const librarySet = new Set(paintSystemLibrary);
  const selectedSet = new Set(selectedFeatures);
  const pool = paintSystemSelectablePool({
    options: featureOptions,
    library: paintSystemLibrary,
    selected: selectedFeatures,
  });
  const packageOnlyOptions = featureOptions.filter((item) => !librarySet.has(item));

  const notifyPaintSystemLimit = () => {
    toast.error(
      paintSystemLimitReached.replace("{max}", String(PAINT_SYSTEM_TIER_MAX)),
    );
  };

  const notifyOptionsLimit = () => {
    toast.error(
      paintSystemOptionsLimitReached.replace(
        "{max}",
        String(PAINT_SYSTEM_OPTIONS_MAX),
      ),
    );
  };

  const updateTierPaintSystem = (patch: {
    options?: string[];
    selected?: string[];
  }) => {
    onChange((prev) =>
      updateTier(prev, tierKey, {
        ...(patch.options !== undefined && {
          paintSystemFeatureOptions: mergePaintSystemOptionLists(patch.options),
        }),
        ...(patch.selected !== undefined && {
          paintSystemFeatures: enforcePaintSystemLimit(patch.selected),
        }),
      }),
    );
  };

  const setSelectedFeatures = (nextSelected: string[]) => {
    updateTierPaintSystem({ selected: nextSelected });
  };

  const addOption = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;

    if (!canAddPaintSystemOption(featureOptions, trimmed)) {
      if (featureOptions.includes(trimmed)) return true;
      notifyOptionsLimit();
      return false;
    }

    updateTierPaintSystem({
      options: mergePaintSystemOptionLists(featureOptions, [trimmed]),
    });
    return true;
  };

  const removeOption = (feature: string) => {
    updateTierPaintSystem({
      options: featureOptions.filter((item) => item !== feature),
      selected: selectedFeatures.filter((item) => item !== feature),
    });
  };

  const toggleFeature = (feature: string, selected: boolean) => {
    if (selected && !canAddPaintSystemFeature(selectedFeatures, feature)) {
      notifyPaintSystemLimit();
      return;
    }

    const next = selected
      ? [...selectedFeatures, feature]
      : selectedFeatures.filter((item) => item !== feature);
    setSelectedFeatures(next);
  };

  const addGuestOption = () => {
    if (!addOption(draft)) return;
    setDraft("");
  };

  const addLibraryItem = async () => {
    const value = draft.trim();
    if (!value || libraryBusy) return;

    setLibraryBusy(true);
    const result = await addPaintSystemLibraryItem(value);
    setLibraryBusy(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    onPaintSystemLibraryChange(result.library);
    addOption(value);
    setDraft("");
  };

  const removeLibraryItem = async (item: string) => {
    if (libraryBusy) return;

    setLibraryBusy(true);
    const result = await removePaintSystemLibraryItem(item);
    setLibraryBusy(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    onPaintSystemLibraryChange(result.library);
    onChange((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) => ({
        ...tier,
        paintSystemFeatures: (tier.paintSystemFeatures ?? []).filter(
          (feature) => feature !== item,
        ),
      })),
    }));
  };

  const previewFeatures = selectedFeatures.slice(0, PREVIEW_LIMIT);
  const remainingCount = Math.max(selectedFeatures.length - PREVIEW_LIMIT, 0);
  const optionsHintText = optionsHint
    .replace("{count}", String(pool.length))
    .replace("{max}", String(PAINT_SYSTEM_TIER_MAX));

  const renderPoolItem = (
    item: string,
    {
      removable,
      onRemove,
      removeLabel,
    }: {
      removable: boolean;
      onRemove?: () => void;
      removeLabel?: string;
    },
  ) => {
    const checkboxId = `${id}-pool-${item}`;
    const checked = selectedSet.has(item);
    const limitBlocked =
      selectedFeatures.length >= PAINT_SYSTEM_TIER_MAX && !checked;

    return (
      <li key={item}>
        <div
          className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm transition ${
            checked
              ? "border-blue-500/30 bg-blue-50/40 text-navy-800"
              : "border-silver-300/80 bg-white/90 text-navy-800"
          }`}
        >
          <label
            htmlFor={checkboxId}
            className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5"
          >
            <input
              id={checkboxId}
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-silver-400 text-blue-600 focus:ring-blue-500"
              checked={checked}
              disabled={libraryBusy || limitBlocked}
              onChange={(event) =>
                toggleFeature(item, event.target.checked)
              }
            />
            <span className="min-w-0 flex-1 leading-snug">{item}</span>
          </label>
          {removable && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={libraryBusy}
              className="shrink-0 rounded p-0.5 text-silver-500 transition hover:bg-silver-100 hover:text-red-600 disabled:opacity-50"
              aria-label={removeLabel ?? `Remove ${item}`}
              title={removeLabel}
            >
              {librarySet.has(item) ? (
                <Trash2 className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <div className="rounded-lg border border-blue-500/15 bg-gradient-to-br from-blue-50/50 to-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="form-section-title">{label}</p>
          <p className="mt-1 text-sm text-silver-600">
            {selectedFeatures.length > 0
              ? paintSystemPageLimit
                  .replace("{selected}", String(selectedFeatures.length))
                  .replace("{max}", String(PAINT_SYSTEM_TIER_MAX))
              : pool.length > 0
                ? optionsHintText
                : emptyHint}
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
                  {moreItemsLabel.replace("{count}", String(remainingCount))}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-outline-dark inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm"
        >
          <Pencil className="h-4 w-4" />
          {editLabel}
        </button>
      </div>

      <SellSheetEditorModal
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        subtitle={hint}
        doneLabel={doneLabel}
      >
        {isLoggedIn ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="form-section-title">{optionsLegend}</p>
                <p className="mt-1 text-sm text-silver-600">{optionsHintText}</p>
              </div>
              {pool.length > 0 ? (
                <SellSheetBulkSelectionActions
                  selectAllLabel={selectAll}
                  clearAllLabel={clearAll}
                  onSelectAll={() =>
                    setSelectedFeatures(enforcePaintSystemLimit(pool))
                  }
                  onClearAll={() => setSelectedFeatures([])}
                />
              ) : null}
            </div>

            {pool.length > 0 ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {pool.map((item) =>
                  renderPoolItem(item, {
                    removable: true,
                    removeLabel: librarySet.has(item)
                      ? removeFromLibrary
                      : undefined,
                    onRemove: () => {
                      if (librarySet.has(item)) {
                        void removeLibraryItem(item);
                      } else {
                        removeOption(item);
                      }
                    },
                  }),
                )}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-silver-600">{emptyHint}</p>
            )}

            <div className="mt-5 border-t border-silver-300/60 pt-5">
              <p className="form-section-title">{libraryLegend}</p>
              <p className="mt-1 text-sm text-silver-600">{libraryHint}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  id={id}
                  type="text"
                  value={draft}
                  disabled={libraryBusy}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addLibraryItem();
                    }
                  }}
                  placeholder={inputPlaceholder}
                  className="form-input min-w-0 flex-1"
                />
                <button
                  type="button"
                  onClick={() => void addLibraryItem()}
                  disabled={libraryBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/25 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-500/40 hover:bg-blue-50 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {addToLibrary}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="form-section-title">{optionsLegend}</p>
                <p className="mt-1 text-sm text-silver-600">
                  {pool.length > 0 ? optionsHintText : signInForLibrary}
                </p>
              </div>
              {pool.length > 0 ? (
                <SellSheetBulkSelectionActions
                  selectAllLabel={selectAll}
                  clearAllLabel={clearAll}
                  onSelectAll={() =>
                    setSelectedFeatures(enforcePaintSystemLimit(pool))
                  }
                  onClearAll={() => setSelectedFeatures([])}
                />
              ) : null}
            </div>

            {pool.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {pool.map((item) =>
                  renderPoolItem(item, {
                    removable: packageOnlyOptions.includes(item),
                    onRemove: () => removeOption(item),
                  }),
                )}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-silver-500">{emptyHint}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-silver-300/60 pt-5">
              <input
                id={id}
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addGuestOption();
                  }
                }}
                placeholder={inputPlaceholder}
                className="form-input min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={addGuestOption}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/25 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-500/40 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                {addLabel}
              </button>
            </div>
          </>
        )}
      </SellSheetEditorModal>
    </div>
  );
}
"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { AreaDeleteConfirm } from "@/components/quotes/simple/AreaDeleteConfirm";
import { AreaEditModal } from "@/components/quotes/simple/AreaEditModal";
import { CustomAreaNameModal } from "@/components/quotes/simple/CustomAreaNameModal";
import {
  CustomQuoteLineItemModal,
  type CustomQuoteLineItemDraft,
} from "@/components/quotes/simple/CustomQuoteLineItemModal";
import { QuoteUnsavedPrompt } from "@/components/quotes/QuoteUnsavedPrompt";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  COMMON_AREAS,
  countAreasMatchingBase,
} from "@/lib/quotes/area-helpers";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type {
  LineItemInput,
  QuotePaintDefaultInput,
  RoomInput,
  SurfaceInput,
} from "@/app/app/(portal)/quotes/actions";
import { lineItemLineTotal } from "@/lib/quotes/pricing";
import type { ClosetDimensions } from "@/lib/quotes/area-surface-dimensions";
import type { AreaSurfaceKey } from "@/lib/quotes/area-surface-catalog";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import type { AreaCostBreakdown } from "@/lib/quotes/area-pricing";
import type { AreaWorkItemsRollup } from "@/lib/quotes/area-substrate-pricing";
import type { TaggedLineItem } from "@/lib/quotes/estimation/types";
import type { BaselinePaintSystemInput } from "@/lib/quotes/baseline-paint";
import type { CustomSubstrateId } from "@/lib/quotes/area-custom-substrates";
import type { AreaSubstrateId } from "@/lib/quotes/area-substrates";
import type { SurfaceLaborOverride } from "@/lib/quotes/surface-labor-defaults";
import type { SubstrateMarkupKey } from "@/lib/quotes/substrate-markup";
import type { Company, QuoteJobType } from "@/types/database";

type SimpleAreasStepProps = {
  company: Company;
  jobType: QuoteJobType;
  rooms: RoomInput[];
  areaSubtotals: number[];
  editingAreaPreviewBreakdown?: AreaCostBreakdown | null;
  editingAreaPreviewLineItems?: TaggedLineItem[] | null;
  editingAreaWorkItemsRollup?: AreaWorkItemsRollup | null;
  coverage: number;
  paintDefaults: QuotePaintDefaultInput[];
  paintProducts: CompanyPaintProductRow[];
  baselineSystems?: BaselinePaintSystemInput[];
  editingAreaIndex: number | null;
  onAddAreaTemplate: (baseName: string) => void;
  onDuplicateArea: (index: number) => void;
  onOpenArea: (index: number) => void;
  onCloseAreaEditor: () => void;
  onUpdateArea: (index: number, patch: Partial<RoomInput>) => void;
  onToggleSurface: (
    roomIndex: number,
    surfaceKey: string,
    enabled: boolean,
    closet?: ClosetDimensions,
  ) => void;
  onUpdateSurface: (
    roomIndex: number,
    surfaceKey: string,
    patch: Partial<SurfaceInput>,
  ) => void;
  onConfirmCloset: (roomIndex: number, dims: ClosetDimensions) => void;
  onResetSurfaceProduct: (
    roomIndex: number,
    surfaceKey: string,
  ) => void;
  onApplyDimensions: (index: number) => void;
  onSaveArea: (index: number) => void | Promise<void>;
  isSavingArea?: boolean;
  onDeleteArea: (index: number) => void | Promise<void>;
  isDeletingArea?: boolean;
  isAreaDirty: (index: number) => boolean;
  onRevertArea: (index: number) => void;
  surfacesForArea: (roomIndex: number) => SurfaceInput[];
  onSubstrateMarginChange?: (
    roomIndex: number,
    markupKey: SubstrateMarkupKey,
    marginPct: number,
  ) => void;
  onSubstrateCoatsChange?: (
    roomIndex: number,
    substrateId: AreaSubstrateId,
    coats: number,
  ) => void;
  onSubstrateProductivityChange?: (
    roomIndex: number,
    substrateId: AreaSubstrateId,
    patch: Partial<SurfaceLaborOverride>,
  ) => void;
  onResetSubstrateProductivity?: (
    roomIndex: number,
    substrateId: AreaSubstrateId,
  ) => void;
  onAddCustomSubstrate?: (roomIndex: number, label: string) => void;
  onRemoveCustomSubstrate?: (
    roomIndex: number,
    substrateId: CustomSubstrateId,
  ) => void;
  customQuoteLineItems?: { item: LineItemInput; index: number }[];
  defaultMarkupPct?: number;
  onAddCustomQuoteLineItem?: (
    draft: CustomQuoteLineItemDraft,
  ) => void;
  onUpdateCustomQuoteLineItem?: (
    index: number,
    draft: CustomQuoteLineItemDraft,
  ) => void;
  onRemoveCustomQuoteLineItem?: (index: number) => void;
  onToggleAreaIncluded?: (index: number) => void;
  onToggleCustomLineItemIncluded?: (index: number) => void;
};

export function SimpleAreasStep({
  company,
  jobType,
  rooms,
  areaSubtotals,
  editingAreaPreviewBreakdown = null,
  editingAreaPreviewLineItems = null,
  editingAreaWorkItemsRollup = null,
  coverage,
  paintDefaults,
  paintProducts,
  baselineSystems,
  editingAreaIndex,
  onAddAreaTemplate,
  onDuplicateArea,
  onOpenArea,
  onCloseAreaEditor,
  onUpdateArea,
  onToggleSurface,
  onUpdateSurface,
  onConfirmCloset,
  onResetSurfaceProduct,
  onApplyDimensions,
  onSaveArea,
  isSavingArea = false,
  onDeleteArea,
  isDeletingArea = false,
  isAreaDirty,
  onRevertArea,
  surfacesForArea,
  onSubstrateMarginChange,
  onSubstrateCoatsChange,
  onSubstrateProductivityChange,
  onResetSubstrateProductivity,
  onAddCustomSubstrate,
  onRemoveCustomSubstrate,
  customQuoteLineItems = [],
  defaultMarkupPct = 0,
  onAddCustomQuoteLineItem,
  onUpdateCustomQuoteLineItem,
  onRemoveCustomQuoteLineItem,
  onToggleAreaIncluded,
  onToggleCustomLineItemIncluded,
}: SimpleAreasStepProps) {
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(
    null,
  );
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false);
  const [customLineModalOpen, setCustomLineModalOpen] = useState(false);
  const [editingCustomLineIndex, setEditingCustomLineIndex] = useState<
    number | null
  >(null);

  const confirmDeleteArea = async () => {
    if (deleteConfirmIndex === null || isDeletingArea) return;
    const index = deleteConfirmIndex;
    if (editingAreaIndex === index) {
      onCloseAreaEditor();
    }
    setDeleteConfirmIndex(null);
    await onDeleteArea(index);
  };

  const editingRoom =
    editingAreaIndex !== null ? rooms[editingAreaIndex] ?? null : null;

  const requestCloseAreaEditor = () => {
    if (editingAreaIndex === null) return;
    if (isAreaDirty(editingAreaIndex)) {
      setUnsavedPromptOpen(true);
      return;
    }
    onCloseAreaEditor();
  };

  const handleDiscardAreaEdits = () => {
    if (editingAreaIndex === null) return;
    onRevertArea(editingAreaIndex);
    setUnsavedPromptOpen(false);
    onCloseAreaEditor();
  };

  const handleSaveAndCloseArea = async () => {
    if (editingAreaIndex === null) return;
    await onSaveArea(editingAreaIndex);
    setUnsavedPromptOpen(false);
  };

  return (
    <section className="rounded-xl border border-border/50 bg-card/30 p-3 shadow-sm sm:p-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Add areas</Label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_AREAS.map((name) => {
            const count = countAreasMatchingBase(name, rooms);
            return (
              <Button
                key={name}
                type="button"
                size="sm"
                variant={count > 0 ? "secondary" : "outline"}
                className={cn(
                  "h-7 gap-1 rounded-md px-2.5 text-xs font-medium",
                  count > 0 && "border-primary/40 bg-primary/10",
                )}
                onClick={() => onAddAreaTemplate(name)}
              >
                <Plus className="h-3 w-3" />
                {name}
                {count > 0 ? (
                  <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-bold text-primary">
                    {count}
                  </span>
                ) : null}
              </Button>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 rounded-md px-2.5 text-xs font-medium"
            onClick={() => setOtherModalOpen(true)}
          >
            <Plus className="h-3 w-3" />
            Other
          </Button>
        </div>
      </div>

      <div className="mt-3 min-w-0 border-t border-border/40 pt-3">
        {rooms.length > 0 ? (
          <>
            <ul className="space-y-1.5">
              {rooms.map((room, index) => {
                const subtotal = areaSubtotals[index] ?? 0;
                const hasDimensions =
                  (room.length_ft && room.width_ft && room.height_ft) ||
                  room.sq_ft > 0;
                const surfaceCount = surfacesForArea(index).length;

                const included = !room.is_optional;

                return (
                  <li key={`${room.name}-${index}`}>
                    <div
                      className={cn(
                        "flex items-stretch overflow-hidden rounded-lg border border-border/50 bg-background/30 transition-colors",
                        included
                          ? "hover:border-primary/40 hover:bg-muted/20"
                          : "border-dashed opacity-60",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onOpenArea(index)}
                        className="flex min-w-0 flex-1 items-center px-2 py-1.5 text-left sm:px-3 sm:py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              included
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {room.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {hasDimensions
                              ? `${room.sq_ft} sq ft`
                              : "Add dimensions"}
                            {surfaceCount > 0
                              ? ` · ${surfaceCount} surface${surfaceCount === 1 ? "" : "s"}`
                              : ""}
                            {!included ? " · Excluded" : ""}
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-stretch border-l border-border/40">
                        <span
                          className={cn(
                            "flex min-w-[5.5rem] items-center justify-end px-2.5 text-base font-bold tabular-nums sm:min-w-[6rem] sm:text-lg",
                            included
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {subtotal > 0 ? formatCurrency(subtotal) : "—"}
                        </span>
                        <div className="grid w-[5.25rem] shrink-0 grid-cols-3 items-center">
                          {onToggleAreaIncluded ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7 justify-self-center",
                                included
                                  ? "text-muted-foreground"
                                  : "text-primary",
                              )}
                              aria-label={
                                included
                                  ? `Exclude ${room.name} from quote`
                                  : `Include ${room.name} in quote`
                              }
                              title={
                                included
                                  ? "Exclude from quote"
                                  : "Include in quote"
                              }
                              onClick={() => onToggleAreaIncluded(index)}
                            >
                              {included ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          ) : (
                            <span />
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 justify-self-center text-muted-foreground"
                            aria-label={`Copy ${room.name}`}
                            title="Copy area"
                            onClick={() => onDuplicateArea(index)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 justify-self-center text-muted-foreground hover:text-destructive"
                            aria-label={`Delete ${room.name}`}
                            title="Remove area"
                            onClick={() => setDeleteConfirmIndex(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground sm:py-8">
            Tap a room type above to add your first area.
          </p>
        )}
      </div>

      {onAddCustomQuoteLineItem ? (
        <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
          {customQuoteLineItems.length > 0 ? (
            <ul className="space-y-1.5">
              {customQuoteLineItems.map(({ item, index }) => {
                const included = !item.is_optional;
                const lineTotal = lineItemLineTotal(item);

                return (
                  <li key={`custom-line-${index}-${item.description}`}>
                    <div
                      className={cn(
                        "flex items-stretch overflow-hidden rounded-lg border border-border/50 bg-background/30 transition-colors",
                        included
                          ? "hover:border-primary/40 hover:bg-muted/20"
                          : "border-dashed opacity-60",
                      )}
                    >
                      <button
                        type="button"
                        disabled={!onUpdateCustomQuoteLineItem}
                        onClick={() => {
                          if (!onUpdateCustomQuoteLineItem) return;
                          setEditingCustomLineIndex(index);
                          setCustomLineModalOpen(true);
                        }}
                        className="flex min-w-0 flex-1 items-center px-2 py-1.5 text-left sm:px-3 sm:py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              included
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {item.description}
                          </p>
                          <p className="truncate text-xs capitalize text-muted-foreground">
                            {item.type}
                            {item.qty !== 1 ? ` · qty ${item.qty}` : ""}
                            {!included ? " · Excluded" : ""}
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-stretch border-l border-border/40">
                        <span
                          className={cn(
                            "flex min-w-[5.5rem] items-center justify-end px-2.5 text-base font-bold tabular-nums sm:min-w-[6rem] sm:text-lg",
                            included
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {lineTotal > 0 ? formatCurrency(lineTotal) : "—"}
                        </span>
                        <div className="grid w-[5.25rem] shrink-0 grid-cols-3 items-center">
                          {onToggleCustomLineItemIncluded ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7 justify-self-center",
                                included
                                  ? "text-muted-foreground"
                                  : "text-primary",
                              )}
                              aria-label={
                                included
                                  ? `Exclude ${item.description} from quote`
                                  : `Include ${item.description} in quote`
                              }
                              title={
                                included
                                  ? "Exclude from quote"
                                  : "Include in quote"
                              }
                              onClick={() =>
                                onToggleCustomLineItemIncluded(index)
                              }
                            >
                              {included ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          ) : (
                            <span />
                          )}
                          <span />
                          {onRemoveCustomQuoteLineItem ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 justify-self-center text-muted-foreground hover:text-destructive"
                              aria-label={`Remove ${item.description}`}
                              title="Remove item"
                              onClick={() =>
                                onRemoveCustomQuoteLineItem(index)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <span />
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 w-full gap-1 rounded-md border-dashed px-2.5 text-xs sm:w-auto"
            onClick={() => {
              setEditingCustomLineIndex(null);
              setCustomLineModalOpen(true);
            }}
          >
            <Plus className="h-3 w-3" />
            Add Custom Item
          </Button>
        </div>
      ) : null}

      <AreaDeleteConfirm
        open={deleteConfirmIndex !== null}
        areaName={
          deleteConfirmIndex !== null
            ? rooms[deleteConfirmIndex]?.name ?? "this area"
            : ""
        }
        isDeleting={isDeletingArea}
        onOpenChange={(open) => {
          if (!open && !isDeletingArea) setDeleteConfirmIndex(null);
        }}
        onConfirm={confirmDeleteArea}
      />

      <QuoteUnsavedPrompt
        open={unsavedPromptOpen}
        title="Save area changes?"
        description="You have unsaved changes to this area. Save them, keep editing, or discard."
        saveLabel="Save"
        onKeepEditing={() => setUnsavedPromptOpen(false)}
        onDiscard={handleDiscardAreaEdits}
        onSaveAndClose={handleSaveAndCloseArea}
      />

      <CustomAreaNameModal
        open={otherModalOpen}
        onOpenChange={setOtherModalOpen}
        onAdd={onAddAreaTemplate}
      />

      <CustomQuoteLineItemModal
        open={customLineModalOpen}
        defaultMarkupPct={defaultMarkupPct}
        initial={
          editingCustomLineIndex !== null
            ? customQuoteLineItems.find(
                ({ index }) => index === editingCustomLineIndex,
              )?.item ?? null
            : null
        }
        onOpenChange={(open) => {
          setCustomLineModalOpen(open);
          if (!open) setEditingCustomLineIndex(null);
        }}
        onSave={(draft) => {
          if (editingCustomLineIndex !== null && onUpdateCustomQuoteLineItem) {
            onUpdateCustomQuoteLineItem(editingCustomLineIndex, draft);
          } else {
            onAddCustomQuoteLineItem?.(draft);
          }
        }}
      />

      <AreaEditModal
        open={editingAreaIndex !== null}
        room={editingRoom}
        roomIndex={editingAreaIndex ?? 0}
        areaSubtotal={editingAreaIndex !== null ? areaSubtotals[editingAreaIndex] ?? 0 : 0}
        areaCostBreakdown={editingAreaPreviewBreakdown}
        areaPreviewLineItems={editingAreaPreviewLineItems}
        workItemsRollup={editingAreaWorkItemsRollup}
        jobType={jobType}
        company={company}
        areaSurfaces={
          editingAreaIndex !== null ? surfacesForArea(editingAreaIndex) : []
        }
        paintDefaults={paintDefaults}
        paintProducts={paintProducts}
        baselineSystems={baselineSystems}
        onOpenChange={(open) => {
          if (!open) requestCloseAreaEditor();
        }}
        onUpdate={(patch) => {
          if (editingAreaIndex === null) return;
          onUpdateArea(editingAreaIndex, patch);
        }}
        onToggleSurface={(surfaceKey, enabled) => {
          if (editingAreaIndex === null) return;
          onToggleSurface(editingAreaIndex, surfaceKey, enabled);
        }}
        onConfirmCloset={(dims) => {
          if (editingAreaIndex === null) return;
          onConfirmCloset(editingAreaIndex, dims);
        }}
        onUpdateSurface={(surfaceKey, patch) => {
          if (editingAreaIndex === null) return;
          onUpdateSurface(editingAreaIndex, surfaceKey, patch);
        }}
        onResetSurfaceProduct={(surfaceKey) => {
          if (editingAreaIndex === null) return;
          onResetSurfaceProduct(editingAreaIndex, surfaceKey);
        }}
        onApplyDimensions={() => {
          if (editingAreaIndex === null) return;
          onApplyDimensions(editingAreaIndex);
        }}
        isSaving={isSavingArea}
        onSave={() => {
          if (editingAreaIndex === null || isSavingArea) return;
          void onSaveArea(editingAreaIndex);
        }}
        onDelete={() => {
          if (editingAreaIndex === null) return;
          setDeleteConfirmIndex(editingAreaIndex);
        }}
        onSubstrateMarginChange={
          onSubstrateMarginChange && editingAreaIndex !== null
            ? (markupKey, marginPct) =>
                onSubstrateMarginChange(
                  editingAreaIndex,
                  markupKey,
                  marginPct,
                )
            : undefined
        }
        onSubstrateCoatsChange={
          onSubstrateCoatsChange && editingAreaIndex !== null
            ? (substrateId, coats) =>
                onSubstrateCoatsChange(editingAreaIndex, substrateId, coats)
            : undefined
        }
        onSubstrateProductivityChange={
          onSubstrateProductivityChange && editingAreaIndex !== null
            ? (substrateId, patch) =>
                onSubstrateProductivityChange(
                  editingAreaIndex,
                  substrateId,
                  patch,
                )
            : undefined
        }
        onResetSubstrateProductivity={
          onResetSubstrateProductivity && editingAreaIndex !== null
            ? (substrateId) =>
                onResetSubstrateProductivity(editingAreaIndex, substrateId)
            : undefined
        }
        onAddCustomSubstrate={
          onAddCustomSubstrate && editingAreaIndex !== null
            ? (label) => onAddCustomSubstrate(editingAreaIndex, label)
            : undefined
        }
        onRemoveCustomSubstrate={
          onRemoveCustomSubstrate && editingAreaIndex !== null
            ? (substrateId) =>
                onRemoveCustomSubstrate(editingAreaIndex, substrateId)
            : undefined
        }
      />
    </section>
  );
}
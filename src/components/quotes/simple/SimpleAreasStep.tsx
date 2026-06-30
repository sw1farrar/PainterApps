"use client";

import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { AreaDeleteConfirm } from "@/components/quotes/simple/AreaDeleteConfirm";
import { AreaEditModal } from "@/components/quotes/simple/AreaEditModal";
import { CustomAreaNameModal } from "@/components/quotes/simple/CustomAreaNameModal";
import { QuoteUnsavedPrompt } from "@/components/quotes/QuoteUnsavedPrompt";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  COMMON_AREAS,
  countAreasMatchingBase,
} from "@/lib/quotes/area-helpers";
import { toggleScopeLine } from "@/lib/quotes/scope-library";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type {
  QuotePaintDefaultInput,
  RoomInput,
  SurfaceInput,
} from "@/app/app/(portal)/quotes/actions";
import type { ClosetDimensions } from "@/lib/quotes/area-surface-dimensions";
import type { AreaSurfaceKey } from "@/lib/quotes/area-surface-catalog";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import type { AreaCostBreakdown } from "@/lib/quotes/area-pricing";
import type { Company, QuoteJobType, QuoteSurfaceKind } from "@/types/database";

type SimpleAreasStepProps = {
  company: Company;
  jobType: QuoteJobType;
  rooms: RoomInput[];
  areaSubtotals: number[];
  areaCostBreakdowns?: AreaCostBreakdown[];
  itemsSubtotal: number;
  coverage: number;
  paintDefaults: QuotePaintDefaultInput[];
  paintProducts: CompanyPaintProductRow[];
  editingAreaIndex: number | null;
  onAddAreaTemplate: (baseName: string) => void;
  onDuplicateArea: (index: number) => void;
  onOpenArea: (index: number) => void;
  onCloseAreaEditor: () => void;
  onUpdateArea: (index: number, patch: Partial<RoomInput>) => void;
  onToggleSurface: (
    roomIndex: number,
    surfaceKey: AreaSurfaceKey,
    enabled: boolean,
    closet?: ClosetDimensions,
  ) => void;
  onUpdateSurface: (
    roomIndex: number,
    surfaceKey: AreaSurfaceKey,
    patch: Partial<SurfaceInput>,
  ) => void;
  onConfirmCloset: (roomIndex: number, dims: ClosetDimensions) => void;
  onSetPaintDefault: (
    surfaceType: QuoteSurfaceKind,
    productId: string | null,
  ) => void;
  onResetSurfaceProduct: (
    roomIndex: number,
    surfaceKey: AreaSurfaceKey,
  ) => void;
  onToggleScopeCategory: (
    roomIndex: number,
    labels: string[],
    enabled: boolean,
  ) => void;
  onApplyDimensions: (index: number) => void;
  onSaveArea: (index: number) => void | Promise<void>;
  isSavingArea?: boolean;
  onDeleteArea: (index: number) => void;
  isAreaDirty: (index: number) => boolean;
  onRevertArea: (index: number) => void;
  surfacesForArea: (roomIndex: number) => SurfaceInput[];
};

export function SimpleAreasStep({
  company,
  jobType,
  rooms,
  areaSubtotals,
  areaCostBreakdowns = [],
  itemsSubtotal,
  coverage,
  paintDefaults,
  paintProducts,
  editingAreaIndex,
  onAddAreaTemplate,
  onDuplicateArea,
  onOpenArea,
  onCloseAreaEditor,
  onUpdateArea,
  onToggleSurface,
  onUpdateSurface,
  onConfirmCloset,
  onSetPaintDefault,
  onResetSurfaceProduct,
  onToggleScopeCategory,
  onApplyDimensions,
  onSaveArea,
  isSavingArea = false,
  onDeleteArea,
  isAreaDirty,
  onRevertArea,
  surfacesForArea,
}: SimpleAreasStepProps) {
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(
    null,
  );
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false);

  const confirmDeleteArea = () => {
    if (deleteConfirmIndex === null) return;
    onDeleteArea(deleteConfirmIndex);
    if (editingAreaIndex === deleteConfirmIndex) {
      onCloseAreaEditor();
    }
    setDeleteConfirmIndex(null);
  };

  const editingRoom =
    editingAreaIndex !== null ? rooms[editingAreaIndex] ?? null : null;

  const handleToggleScope = (index: number, label: string, enabled: boolean) => {
    const room = rooms[index];
    if (!room) return;
    onUpdateArea(index, {
      prep_work: toggleScopeLine(room.prep_work, label, enabled),
    });
  };

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

                return (
                  <li key={`${room.name}-${index}`}>
                    <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-background/30 px-2 py-1.5 transition-colors hover:border-primary/40 hover:bg-muted/20 sm:px-3 sm:py-2">
                      <button
                        type="button"
                        onClick={() => onOpenArea(index)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {room.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {hasDimensions
                              ? `${room.sq_ft} sq ft`
                              : "Add dimensions"}
                            {surfaceCount > 0
                              ? ` · ${surfaceCount} surface${surfaceCount === 1 ? "" : "s"}`
                              : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {subtotal > 0 ? formatCurrency(subtotal) : "—"}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
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
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${room.name}`}
                          title="Remove area"
                          onClick={() => setDeleteConfirmIndex(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex items-center justify-end gap-2 border-t border-border/30 pt-2 text-sm">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="font-display text-base font-semibold tabular-nums text-foreground">
                {formatCurrency(itemsSubtotal)}
              </span>
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground sm:py-8">
            Tap a room type above to add your first area.
          </p>
        )}
      </div>

      <AreaDeleteConfirm
        open={deleteConfirmIndex !== null}
        areaName={
          deleteConfirmIndex !== null
            ? rooms[deleteConfirmIndex]?.name ?? "this area"
            : ""
        }
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmIndex(null);
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

      <AreaEditModal
        open={editingAreaIndex !== null}
        room={editingRoom}
        roomIndex={editingAreaIndex ?? 0}
        areaSubtotal={editingAreaIndex !== null ? areaSubtotals[editingAreaIndex] ?? 0 : 0}
        areaCostBreakdown={
          editingAreaIndex !== null
            ? areaCostBreakdowns[editingAreaIndex] ?? null
            : null
        }
        jobType={jobType}
        company={company}
        areaSurfaces={
          editingAreaIndex !== null ? surfacesForArea(editingAreaIndex) : []
        }
        paintDefaults={paintDefaults}
        paintProducts={paintProducts}
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
        onSetPaintDefault={onSetPaintDefault}
        onResetSurfaceProduct={(surfaceKey) => {
          if (editingAreaIndex === null) return;
          onResetSurfaceProduct(editingAreaIndex, surfaceKey);
        }}
        onToggleScope={(label, enabled) => {
          if (editingAreaIndex === null) return;
          handleToggleScope(editingAreaIndex, label, enabled);
        }}
        onToggleScopeCategory={(labels, enabled) => {
          if (editingAreaIndex === null) return;
          onToggleScopeCategory(editingAreaIndex, labels, enabled);
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
      />
    </section>
  );
}
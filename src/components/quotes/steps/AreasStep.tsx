"use client";

import { useCallback, useState } from "react";
import { AppDrawer } from "@/components/portal/AppDrawer";
import { AreaBreakdownPane } from "@/components/quotes/areas/AreaBreakdownPane";
import { Button } from "@/components/ui/button";
import { AreaCardList } from "@/components/quotes/areas/AreaCardList";
import { AreaDetailPanel } from "@/components/quotes/areas/AreaDetailPanel";
import { AreasFloatingBar } from "@/components/quotes/areas/AreasFloatingBar";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { lineItemTotal } from "@/lib/quotes/area-helpers";
import type { LineItemInput, RoomInput, SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import type {
  Company,
  QuoteEstimationMode,
  QuoteRateType,
  QuoteSurfaceKind,
} from "@/types/database";
import { cn } from "@/lib/utils";

type AreasStepProps = {
  fillWorkspace?: boolean;
  rooms: RoomInput[];
  selectedAreaIndex: number;
  areaSubtotals: number[];
  surfacesForSelectedArea: { surface: SurfaceInput; index: number }[];
  lineItemsForSelectedArea: LineItemInput[];
  globalManualLineItems: { item: LineItemInput; index: number }[];
  estimationMode: QuoteEstimationMode;
  company: Company;
  coverage: number;
  pricingSummary: {
    painterRate: number;
    prepRate: number;
    laborCostPerHour: number;
    laborMarkupPct: number;
    overheadPct: number;
    taxRate: number;
  };
  onSelectArea: (index: number) => void;
  onReorderAreas: (from: number, to: number) => void;
  onAddArea: (name: string) => void;
  onOpenCustomArea: () => void;
  onUpdateArea: (index: number, patch: Partial<RoomInput>) => void;
  onApplyDimensions: (index: number) => void;
  onDuplicateArea: (index: number) => void;
  onDeleteArea: (index: number) => void;
  onAddSurface: (
    roomIndex: number,
    type: QuoteSurfaceKind,
    rateType: QuoteRateType,
  ) => void;
  onUpdateSurface: (surfaceIndex: number, patch: Partial<SurfaceInput>) => void;
  onRemoveSurface: (surfaceIndex: number) => void;
  onEditRoom: (index: number) => void;
  onRegenerateAll: () => void;
  onRegenerateArea: (index: number) => void;
  onAddLineItemForArea: (index: number) => void;
  onAddGlobalLineItem: () => void;
  onEditGlobalLineItem: (index: number) => void;
  onRemoveGlobalLineItem: (index: number) => void;
  onToggleLineItemOptional?: (index: number) => void;
  lineItems: LineItemInput[];
  powerMode?: boolean;
  onBulkDelete?: (indices: number[]) => void;
  onBulkDuplicate?: (indices: number[]) => void;
  onBulkSetOptional?: (indices: number[], isOptional: boolean) => void;
};

export function AreasStep({
  fillWorkspace = false,
  rooms,
  selectedAreaIndex,
  areaSubtotals,
  surfacesForSelectedArea,
  lineItemsForSelectedArea,
  globalManualLineItems,
  estimationMode,
  company,
  coverage,
  pricingSummary,
  onSelectArea,
  onReorderAreas,
  onAddArea,
  onOpenCustomArea,
  onUpdateArea,
  onApplyDimensions,
  onDuplicateArea,
  onDeleteArea,
  onAddSurface,
  onUpdateSurface,
  onRemoveSurface,
  onEditRoom,
  onRegenerateAll,
  onRegenerateArea,
  onAddLineItemForArea,
  onAddGlobalLineItem,
  onEditGlobalLineItem,
  onRemoveGlobalLineItem,
  onToggleLineItemOptional,
  lineItems,
  powerMode = false,
  onBulkDelete,
  onBulkDuplicate,
  onBulkSetOptional,
}: AreasStepProps) {
  const [rateSearch, setRateSearch] = useState("");
  const [mobileAreaDrawerOpen, setMobileAreaDrawerOpen] = useState(false);
  const [bulkSelectedIndices, setBulkSelectedIndices] = useState<Set<number>>(
    () => new Set(),
  );

  const toggleBulkSelect = useCallback((index: number) => {
    setBulkSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const selectAllAreas = useCallback(() => {
    setBulkSelectedIndices(new Set(rooms.map((_, index) => index)));
  }, [rooms]);

  const clearBulkSelection = useCallback(() => {
    setBulkSelectedIndices(new Set());
  }, []);

  const selectedBulkList = [...bulkSelectedIndices].sort((a, b) => a - b);

  const selectedRoom = rooms[selectedAreaIndex];
  const selectedSubtotal = areaSubtotals[selectedAreaIndex] ?? 0;

  const openMobileAreaDrawer = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setMobileAreaDrawerOpen(true);
    }
  };

  const handleSelectArea = (index: number) => {
    onSelectArea(index);
    openMobileAreaDrawer();
  };

  const handleAddArea = (name: string) => {
    onAddArea(name);
    openMobileAreaDrawer();
  };

  const areaDetailPanel = selectedRoom ? (
    <AreaDetailPanel
      room={selectedRoom}
      roomIndex={selectedAreaIndex}
      areaSubtotal={selectedSubtotal}
      surfaces={surfacesForSelectedArea}
      lineItems={lineItemsForSelectedArea}
      company={company}
      coverage={coverage}
      rateSearch={rateSearch}
      onUpdateRoom={(patch) => onUpdateArea(selectedAreaIndex, patch)}
      onApplyDimensions={() => onApplyDimensions(selectedAreaIndex)}
      onDuplicate={() => onDuplicateArea(selectedAreaIndex)}
      onDelete={() => {
        onDeleteArea(selectedAreaIndex);
        setMobileAreaDrawerOpen(false);
      }}
      onAddSurface={(type, rateType) =>
        onAddSurface(selectedAreaIndex, type, rateType)
      }
      onUpdateSurface={onUpdateSurface}
      onRemoveSurface={onRemoveSurface}
      onEditRoom={() => onEditRoom(selectedAreaIndex)}
    />
  ) : null;

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col",
        fillWorkspace ? "h-full gap-3" : "space-y-4 pb-32 lg:space-y-3 lg:pb-0",
      )}
    >
      <details className="group rounded-lg border border-border/60 bg-muted/20 lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          Company rates
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (tap to expand)
          </span>
        </summary>
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border/40 px-4 pb-4 pt-3 text-sm text-muted-foreground">
          <span>Labor: {formatCurrency(pricingSummary.laborCostPerHour)}/hr</span>
          <span>Overhead: {pricingSummary.overheadPct}%</span>
          <span>Tax: {pricingSummary.taxRate}%</span>
        </div>
      </details>

      <AreasFloatingBar
        variant="inline"
        rateSearch={rateSearch}
        onRateSearchChange={setRateSearch}
        onAddArea={handleAddArea}
        onOpenCustomArea={onOpenCustomArea}
        onRegenerateAll={onRegenerateAll}
        showRegenerate={estimationMode !== "manual"}
        bulkSelectionCount={bulkSelectedIndices.size}
        onBulkDuplicate={() => {
          onBulkDuplicate?.(selectedBulkList);
          clearBulkSelection();
        }}
        onBulkDelete={() => {
          onBulkDelete?.(selectedBulkList);
          clearBulkSelection();
        }}
        onBulkMarkOptional={() => {
          onBulkSetOptional?.(selectedBulkList, true);
          clearBulkSelection();
        }}
        onBulkMarkRequired={() => {
          onBulkSetOptional?.(selectedBulkList, false);
          clearBulkSelection();
        }}
        className="hidden lg:block"
      />

      <p className="hidden text-xs text-muted-foreground lg:block">
        Labor {formatCurrency(pricingSummary.laborCostPerHour)}/hr · Overhead{" "}
        {pricingSummary.overheadPct}% · Tax {pricingSummary.taxRate}%
      </p>

      <div
        className={cn(
          "grid gap-4 lg:grid-cols-12 lg:gap-4",
          fillWorkspace ? "min-h-0 flex-1 lg:items-stretch" : "lg:items-start",
        )}
      >
        <div
          className={cn(
            "lg:col-span-3",
            fillWorkspace && "flex min-h-0 flex-col",
          )}
        >
          <p className="mb-2 shrink-0 text-sm font-semibold text-foreground">
            Areas
          </p>
          <div
            className={cn(fillWorkspace && "min-h-0 flex-1 overflow-y-auto")}
          >
            <AreaCardList
              rooms={rooms}
              selectedIndex={selectedAreaIndex}
              subtotals={areaSubtotals}
              onSelect={handleSelectArea}
              onReorder={onReorderAreas}
              powerMode={powerMode}
              bulkSelectedIndices={bulkSelectedIndices}
              onToggleBulkSelect={toggleBulkSelect}
              onSelectAll={selectAllAreas}
              onClearBulkSelection={clearBulkSelection}
            />
          </div>
        </div>

        <div
          className={cn(
            "hidden lg:col-span-6 lg:block",
            fillWorkspace && "min-h-0 overflow-y-auto",
          )}
        >
          {selectedRoom ? (
            areaDetailPanel
          ) : (
            <div className="flex h-full min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-border text-center text-muted-foreground">
              Select or add an area to begin.
            </div>
          )}
        </div>

        <div
          className={cn(
            "hidden lg:col-span-3 lg:block",
            fillWorkspace && "min-h-0 overflow-y-auto",
          )}
        >
          <AreaBreakdownPane
            areaName={selectedRoom?.name}
            areaSubtotal={selectedSubtotal}
            lineItems={lineItemsForSelectedArea}
            lineItemIndices={lineItemsForSelectedArea.map((item) =>
              lineItems.findIndex(
                (candidate) =>
                  candidate === item ||
                  (candidate.description === item.description &&
                    candidate.room_index === item.room_index &&
                    candidate.room_id === item.room_id),
              ),
            )}
            onAddLineItem={() => onAddLineItemForArea(selectedAreaIndex)}
            onRegenerate={() => onRegenerateArea(selectedAreaIndex)}
            showRegenerate={estimationMode !== "manual"}
            onToggleOptional={onToggleLineItemOptional}
          />
        </div>
      </div>

      {globalManualLineItems.length > 0 || rooms.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                Global manual items
              </p>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={onAddGlobalLineItem}
              >
                + Add global item
              </button>
            </div>
            {globalManualLineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Items not tied to a specific area appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {globalManualLineItems.map(({ item, index }) => (
                  <li
                    key={`global-${item.description}-${index}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{item.description}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-medium">
                        {formatCurrency(lineItemTotal(item))}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => onEditGlobalLineItem(index)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-destructive hover:underline"
                        onClick={() => onRemoveGlobalLineItem(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <AppDrawer
        open={mobileAreaDrawerOpen}
        onOpenChange={setMobileAreaDrawerOpen}
        title={selectedRoom?.name ?? "Area"}
        description="Edit measurements, surfaces, and line items. Close when done."
        footer={
          <Button
            className="w-full"
            type="button"
            onClick={() => setMobileAreaDrawerOpen(false)}
          >
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          {areaDetailPanel}
          {selectedRoom ? (
            <AreaBreakdownPane
              areaName={selectedRoom.name}
              areaSubtotal={selectedSubtotal}
              lineItems={lineItemsForSelectedArea}
              lineItemIndices={lineItemsForSelectedArea.map((item) =>
                lineItems.findIndex(
                  (candidate) =>
                    candidate === item ||
                    (candidate.description === item.description &&
                      candidate.room_index === item.room_index &&
                      candidate.room_id === item.room_id),
                ),
              )}
              onAddLineItem={() => onAddLineItemForArea(selectedAreaIndex)}
              onRegenerate={() => onRegenerateArea(selectedAreaIndex)}
              showRegenerate={estimationMode !== "manual"}
              onToggleOptional={onToggleLineItemOptional}
            />
          ) : null}
        </div>
      </AppDrawer>

      <AreasFloatingBar
        variant="fixed"
        rateSearch={rateSearch}
        onRateSearchChange={setRateSearch}
        onAddArea={handleAddArea}
        onOpenCustomArea={onOpenCustomArea}
        onRegenerateAll={onRegenerateAll}
        showRegenerate={estimationMode !== "manual"}
        bulkSelectionCount={bulkSelectedIndices.size}
        onBulkDuplicate={() => {
          onBulkDuplicate?.(selectedBulkList);
          clearBulkSelection();
        }}
        onBulkDelete={() => {
          onBulkDelete?.(selectedBulkList);
          clearBulkSelection();
        }}
        onBulkMarkOptional={() => {
          onBulkSetOptional?.(selectedBulkList, true);
          clearBulkSelection();
        }}
        onBulkMarkRequired={() => {
          onBulkSetOptional?.(selectedBulkList, false);
          clearBulkSelection();
        }}
      />
    </div>
  );
}
"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { RoomInput } from "@/app/app/(portal)/quotes/actions";

type AreaCardListProps = {
  rooms: RoomInput[];
  selectedIndex: number;
  subtotals: number[];
  onSelect: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  powerMode?: boolean;
  bulkSelectedIndices?: Set<number>;
  onToggleBulkSelect?: (index: number) => void;
  onSelectAll?: () => void;
  onClearBulkSelection?: () => void;
};

function SortableAreaCard({
  room,
  index,
  selected,
  bulkSelected,
  subtotal,
  powerMode,
  onSelect,
  onToggleBulkSelect,
}: {
  room: RoomInput;
  index: number;
  selected: boolean;
  bulkSelected: boolean;
  subtotal: number;
  powerMode: boolean;
  onSelect: () => void;
  onToggleBulkSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `area-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-stretch gap-2 rounded-xl border bg-card transition-shadow",
        selected || bulkSelected
          ? "border-primary ring-1 ring-primary/30"
          : "border-border",
        isDragging && "z-10 shadow-lg",
      )}
    >
      {powerMode ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleBulkSelect?.();
          }}
          className={cn(
            "flex w-9 shrink-0 items-center justify-center border-r border-border transition-colors",
            bulkSelected
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50",
          )}
          aria-label={bulkSelected ? "Deselect area" : "Select area"}
        >
          {bulkSelected ? (
            <Check className="h-4 w-4" />
          ) : (
            <span className="h-3.5 w-3.5 rounded border border-border" />
          )}
        </button>
      ) : null}
      <button
        type="button"
        className="flex shrink-0 cursor-grab items-center px-2 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-3 py-3 pr-3 text-left"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {room.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={room.photo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{room.name}</p>
          <p className="text-xs text-muted-foreground">
            {room.sq_ft > 0 ? `${room.sq_ft} sq ft` : "No sq ft yet"}
            {room.coats ? ` · ${room.coats} coats` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {formatCurrency(subtotal)}
            </Badge>
            {room.is_optional ? (
              <Badge variant="outline" className="text-xs">
                Optional
              </Badge>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  );
}

export function AreaCardList({
  rooms,
  selectedIndex,
  subtotals,
  onSelect,
  onReorder,
  powerMode = false,
  bulkSelectedIndices,
  onToggleBulkSelect,
  onSelectAll,
  onClearBulkSelection,
}: AreaCardListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(String(active.id).replace("area-", ""));
    const to = Number(String(over.id).replace("area-", ""));
    if (!Number.isNaN(from) && !Number.isNaN(to)) onReorder(from, to);
  };

  const bulkCount = bulkSelectedIndices?.size ?? 0;
  const allSelected = powerMode && rooms.length > 0 && bulkCount === rooms.length;

  if (!rooms.length) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No areas yet. Add a room to start estimating.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {powerMode && onSelectAll && onClearBulkSelection ? (
        <div className="flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={allSelected ? onClearBulkSelection : onSelectAll}
            className="text-xs font-medium text-primary hover:underline"
          >
            {allSelected ? "Clear selection" : "Select all"}
          </button>
          {bulkCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {bulkCount} selected
            </span>
          ) : null}
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={rooms.map((_, i) => `area-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {rooms.map((room, index) => (
              <SortableAreaCard
                key={`${room.name}-${index}-${room.id ?? "new"}`}
                room={room}
                index={index}
                selected={index === selectedIndex}
                bulkSelected={bulkSelectedIndices?.has(index) ?? false}
                subtotal={subtotals[index] ?? 0}
                powerMode={powerMode}
                onSelect={() => onSelect(index)}
                onToggleBulkSelect={
                  onToggleBulkSelect
                    ? () => onToggleBulkSelect(index)
                    : undefined
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
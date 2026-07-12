"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Plus, Trash2, X } from "lucide-react";
import { ClosetDimensionsModal } from "@/components/quotes/simple/ClosetDimensionsModal";
import { CustomSubstrateNameModal } from "@/components/quotes/simple/CustomSubstrateNameModal";
import { SubstrateDetailModal } from "@/components/quotes/simple/SubstrateDetailModal";
import {
  WorkItemsTable,
  buildWorkItemTableRows,
} from "@/components/quotes/simple/WorkItemsTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  QuotePaintDefaultInput,
  RoomInput,
  SurfaceInput,
} from "@/app/app/(portal)/quotes/actions";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import type { AreaSurfaceKey } from "@/lib/quotes/area-surface-catalog";
import {
  findSubstrateDefinition,
  isCustomSubstrateId,
  listSubstrateDefinitionsForRoom,
  type CustomSubstrateId,
} from "@/lib/quotes/area-custom-substrates";
import {
  isSubstrateActive,
  type AreaSubstrateDefinition,
  type AreaSubstrateId,
} from "@/lib/quotes/area-substrates";
import type { BaselinePaintSystemInput } from "@/lib/quotes/baseline-paint";
import type { AreaWorkItemsRollup } from "@/lib/quotes/area-substrate-pricing";
import {
  parseClosetDimensions,
  type ClosetDimensions,
} from "@/lib/quotes/area-surface-dimensions";
import { totalSurfaceSqFt } from "@/lib/quotes/area-surface-metrics";
import {
  areaMaterialsAtCost,
  type AreaCostBreakdown,
} from "@/lib/quotes/area-pricing";
import {
  buildAreaMiniQuote,
  type AreaMiniQuoteDocument,
} from "@/lib/quotes/area-mini-quote";
import type { TaggedLineItem } from "@/lib/quotes/estimation/types";

import {
  addAreaCustomScopeLabel,
  setSubstrateScopeEntries,
  type SubstrateScopeEntry,
} from "@/lib/quotes/scope-library";
import {
  isSundriesFixedAmount,
  resolveAreaOverhead,
  setAreaOverhead,
  type AreaOverheadSettings,
} from "@/lib/quotes/area-overhead";
import type { SubstrateMarkupKey } from "@/lib/quotes/substrate-markup";
import type { SurfaceLaborOverride } from "@/lib/quotes/surface-labor-defaults";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Company, QuoteJobType } from "@/types/database";

type AreaEditModalProps = {
  open: boolean;
  room: RoomInput | null;
  roomIndex: number;
  areaSubtotal: number;
  areaCostBreakdown?: AreaCostBreakdown | null;
  areaPreviewLineItems?: TaggedLineItem[] | null;
  workItemsRollup?: AreaWorkItemsRollup | null;
  jobType: QuoteJobType;
  company: Company;
  areaSurfaces: SurfaceInput[];
  paintDefaults: QuotePaintDefaultInput[];
  paintProducts: CompanyPaintProductRow[];
  baselineSystems?: BaselinePaintSystemInput[];
  onOpenChange: (open: boolean) => void;
  onUpdate: (patch: Partial<RoomInput>) => void;
  onToggleSurface: (surfaceKey: string, enabled: boolean) => void;
  onAddCustomSubstrate?: (label: string) => void;
  onRemoveCustomSubstrate?: (substrateId: CustomSubstrateId) => void;
  onConfirmCloset: (dims: ClosetDimensions) => void;
  onUpdateSurface: (
    surfaceKey: string,
    patch: Partial<SurfaceInput>,
  ) => void;
  onResetSurfaceProduct: (surfaceKey: string) => void;
  onApplyDimensions: () => void;
  isSaving?: boolean;
  onSave: () => void;
  onDelete: () => void;
  onSubstrateMarginChange?: (
    markupKey: SubstrateMarkupKey,
    marginPct: number,
  ) => void;
  onSubstrateCoatsChange?: (
    substrateId: AreaSubstrateId,
    coats: number,
  ) => void;
  onSubstrateProductivityChange?: (
    substrateId: AreaSubstrateId,
    patch: Partial<SurfaceLaborOverride>,
  ) => void;
  onResetSubstrateProductivity?: (substrateId: AreaSubstrateId) => void;
};

function CompactPricingStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 items-center gap-2 rounded-md border border-border/50 bg-muted/15 px-2 py-1",
        className,
      )}
    >
      <p className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-xs font-semibold tabular-nums leading-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function AreaHeaderStats({ breakdown }: { breakdown: AreaCostBreakdown }) {
  const materialsTotal = areaMaterialsAtCost(breakdown);

  return (
    <div className="flex shrink-0 items-stretch gap-1.5">
      <div className="flex min-w-[8.5rem] max-w-[10.5rem] flex-col gap-1">
        <CompactPricingStat
          className="flex-1"
          label="Materials"
          value={formatCurrency(materialsTotal)}
        />
        <CompactPricingStat
          className="flex-1"
          label="Labor"
          value={formatCurrency(breakdown.laborCostAtCost)}
        />
      </div>
      <div className="flex items-center gap-2 rounded-md border border-primary/35 bg-primary/10 px-3 py-2">
        <p className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          Area total
        </p>
        <p className="text-2xl font-bold tabular-nums leading-none tracking-tight text-foreground sm:text-3xl">
          {formatCurrency(breakdown.bidPrice)}
        </p>
      </div>
    </div>
  );
}

function formatMiniQuoteAmount(amount: number): string {
  return amount > 0 ? formatCurrency(amount) : "—";
}

function AreaMiniQuoteItemRow({
  name,
  rateDetail,
  amount,
}: {
  name: string;
  rateDetail: string;
  amount: number;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-1 pl-1 leading-none">
      <div className="min-w-0 truncate text-[8px] text-muted-foreground/90">
        <span className="text-foreground/90">{name}</span>
        <span> · {rateDetail}</span>
      </div>
      <span className="shrink-0 text-[9px] font-semibold tabular-nums text-foreground">
        {formatMiniQuoteAmount(amount)}
      </span>
    </div>
  );
}

function AreaDetailsMiniQuote({ quote }: { quote: AreaMiniQuoteDocument }) {
  return (
    <div className="flex max-h-full min-h-0 w-full min-w-0 flex-col justify-center gap-0.5 overflow-y-auto overflow-x-hidden">
      {quote.sections.map((section) => (
        <div key={section.key} className="space-y-0.5">
          <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </p>
          {section.items.map((item) => (
            <AreaMiniQuoteItemRow
              key={item.key}
              name={item.name}
              rateDetail={item.rateDetail}
              amount={item.amount}
            />
          ))}
        </div>
      ))}
      <div className="mt-0.5 border-t border-border/45 pt-0.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-1 leading-none">
          <span className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            Total
          </span>
          <span className="shrink-0 text-[9px] font-bold tabular-nums text-foreground">
            {formatMiniQuoteAmount(quote.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function selectInputContents(event: { currentTarget: HTMLInputElement }) {
  event.currentTarget.select();
}

function SundriesModeCard({
  active,
  dimmed,
  label,
  preview,
  htmlFor,
  onActivate,
  children,
}: {
  active: boolean;
  dimmed?: boolean;
  label: string;
  preview?: string;
  htmlFor?: string;
  onActivate: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={active ? -1 : 0}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
      className={cn(
        "rounded-md border bg-muted/15 px-2 py-1 transition-colors",
        active
          ? "border-primary/35 bg-primary/10 border-l-[3px] border-l-primary"
          : "cursor-pointer border-border/50 border-l-[3px] border-l-transparent hover:border-border hover:bg-muted/25",
        dimmed && "opacity-55",
      )}
    >
      <Label
        htmlFor={htmlFor}
        className="pointer-events-none text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground"
      >
        {label}
      </Label>
      <div className="mt-0.5" onPointerDown={(event) => event.stopPropagation()}>
        {children}
      </div>
      {preview ? (
        <p className="mt-0.5 text-center text-[9px] font-medium tabular-nums text-muted-foreground/80">
          {preview}
        </p>
      ) : null}
    </div>
  );
}

function SundriesControls({
  areaOverhead,
  onChange,
  overheadCostAtCost,
}: {
  areaOverhead: AreaOverheadSettings;
  onChange: (patch: Partial<AreaOverheadSettings>) => void;
  overheadCostAtCost?: number;
}) {
  const isFixed = isSundriesFixedAmount(areaOverhead);
  const pctPreview =
    !isFixed && overheadCostAtCost && overheadCostAtCost > 0
      ? formatCurrency(overheadCostAtCost)
      : undefined;
  const fixedPreview =
    isFixed && areaOverhead.fixedAmount > 0
      ? formatCurrency(areaOverhead.fixedAmount)
      : undefined;

  return (
    <div className="flex h-[6.75rem] min-h-[6.75rem] max-h-[6.75rem] min-w-0 items-center px-2 py-1.5 sm:px-2.5">
      <div className="grid w-full min-w-0 grid-cols-2 gap-1.5">
        <SundriesModeCard
          active={!isFixed}
          dimmed={isFixed}
          label="Materials %"
          preview={pctPreview}
          htmlFor="area-sundries-materials"
          onActivate={() => onChange({ mode: "materialsPct" })}
        >
          <div className="flex items-center gap-0.5">
            <Input
              id="area-sundries-materials"
              className="h-6 min-w-0 flex-1 px-1 text-center text-[11px] tabular-nums"
              type="number"
              min={0}
              step="0.1"
              value={areaOverhead.materialsPct || ""}
              placeholder="0"
              onFocus={(event) => {
                onChange({ mode: "materialsPct" });
                selectInputContents(event);
              }}
              onClick={selectInputContents}
              onChange={(e) => {
                const raw = e.target.value;
                onChange({
                  mode: "materialsPct",
                  materialsPct: raw === "" ? 0 : Number(raw),
                });
              }}
            />
            <span className="w-2.5 shrink-0 text-[9px] text-muted-foreground/80">
              %
            </span>
          </div>
        </SundriesModeCard>

        <SundriesModeCard
          active={isFixed}
          dimmed={!isFixed}
          label="Fixed amount"
          preview={fixedPreview}
          htmlFor="area-sundries-amount"
          onActivate={() => onChange({ mode: "fixedAmount" })}
        >
          <div className="relative min-w-0">
            <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
              $
            </span>
            <Input
              id="area-sundries-amount"
              className="h-6 w-full pl-3.5 pr-1 text-center text-[11px] font-semibold tabular-nums"
              type="number"
              min={0}
              step="0.01"
              value={areaOverhead.fixedAmount || ""}
              placeholder="0"
              onFocus={(event) => {
                onChange({ mode: "fixedAmount" });
                selectInputContents(event);
              }}
              onClick={selectInputContents}
              onChange={(e) => {
                const raw = e.target.value;
                onChange({
                  mode: "fixedAmount",
                  fixedAmount: raw === "" ? 0 : Number(raw),
                });
              }}
            />
          </div>
        </SundriesModeCard>
      </div>
    </div>
  );
}

const bandSectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80";

const BAND_SECTION_DESCRIPTIONS = {
  areaDetails:
    "Room dimensions and total surface area for this space. Surface area is calculated from the active substrates and dimensions entered here.",
  substrates:
    "Choose which surfaces to paint in this area — walls, ceiling, trim, doors, cabinets, and custom items. Active substrates drive paint quantities, labor hours, and pricing line items.",
  sundries:
    "Miscellaneous supplies and consumables for this area. Toggle between Materials % (a percentage of paint and materials cost) or a Fixed amount flat dollar value. Only the active option is used in the estimate.",
} as const;

function BandSectionInfo({
  description,
  side = "right",
}: {
  description: string;
  side?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground/65 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Section information"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onClick={(event) => {
              event.stopPropagation();
              setOpen((previous) => !previous);
            }}
          >
            <Info className="h-3 w-3" strokeWidth={2.25} aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align="center"
          sideOffset={10}
          className="max-w-[15rem] text-left leading-snug"
        >
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BandSectionHeader({
  children,
  description,
  infoSide = "right",
}: {
  children: React.ReactNode;
  description?: string;
  infoSide?: "left" | "right";
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border/50 bg-gradient-to-r from-primary/[0.06] via-muted/30 to-muted/10 px-3.5 py-2 sm:px-4">
      <span
        className="h-3.5 w-0.5 shrink-0 rounded-full bg-primary/80"
        aria-hidden
      />
      <span className={bandSectionLabelClass}>{children}</span>
      {description ? (
        <BandSectionInfo description={description} side={infoSide} />
      ) : null}
    </div>
  );
}

const substratePillBaseClass =
  "flex h-7 min-h-7 w-full min-w-0 items-center justify-center rounded-full border px-2 text-[11px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

function SubstratePill({
  label,
  active,
  onClick,
  onRemove,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) {
  return (
    <span className="group relative block w-full min-w-0">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          substratePillBaseClass,
          onRemove && "pr-6",
          active
            ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/35 hover:bg-muted/40 hover:text-foreground",
        )}
      >
        <span className="truncate">{label}</span>
      </button>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className={cn(
            "absolute right-1 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
            active
              ? "text-primary-foreground/75 hover:bg-primary-foreground/15 hover:text-primary-foreground"
              : "text-muted-foreground/80 hover:bg-muted hover:text-foreground",
          )}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </span>
  );
}

export function AreaEditModal({
  open,
  room,
  roomIndex,
  areaSubtotal,
  areaCostBreakdown = null,
  areaPreviewLineItems = null,
  workItemsRollup = null,
  jobType,
  company,
  areaSurfaces,
  paintDefaults,
  paintProducts,
  baselineSystems,
  onOpenChange,
  onUpdate,
  onToggleSurface,
  onAddCustomSubstrate,
  onRemoveCustomSubstrate,
  onConfirmCloset,
  onUpdateSurface,
  onResetSurfaceProduct,
  onApplyDimensions,
  isSaving = false,
  onSave,
  onDelete,
  onSubstrateMarginChange,
  onSubstrateCoatsChange,
  onSubstrateProductivityChange,
  onResetSubstrateProductivity,
}: AreaEditModalProps) {
  const lastAutoCalcKey = useRef("");
  const [closetModalOpen, setClosetModalOpen] = useState(false);
  const [customSubstrateModalOpen, setCustomSubstrateModalOpen] = useState(false);
  const [detailSubstrateId, setDetailSubstrateId] =
    useState<AreaSubstrateId | null>(null);

  useEffect(() => {
    if (!open) {
      setDetailSubstrateId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!room || !open) return;
    const { length_ft, width_ft, height_ft } = room;
    if (!length_ft || !width_ft || !height_ft) return;

    const key = `${length_ft}-${width_ft}-${height_ft}`;
    if (key === lastAutoCalcKey.current) return;

    const timer = setTimeout(() => {
      lastAutoCalcKey.current = key;
      onApplyDimensions();
    }, 500);

    return () => clearTimeout(timer);
  }, [room?.length_ft, room?.width_ft, room?.height_ft, open, onApplyDimensions, room]);

  const surfaceByKey = useMemo(() => {
    const map = new Map<AreaSurfaceKey, SurfaceInput>();
    for (const surface of areaSurfaces) {
      if (surface.surface_key) {
        map.set(surface.surface_key as AreaSurfaceKey, surface);
      }
    }
    return map;
  }, [areaSurfaces]);

  const closetSurface = surfaceByKey.get("closet");
  const closetInitial = parseClosetDimensions(closetSurface?.notes);

  const activeSurfaceKeys = useMemo(
    () => new Set(surfaceByKey.keys()),
    [surfaceByKey],
  );

  const substratePills = useMemo(
    () => listSubstrateDefinitionsForRoom(room?.prep_work),
    [room?.prep_work],
  );

  const activeSubstrates = useMemo(
    () =>
      substratePills.filter((substrate) =>
        isSubstrateActive(substrate, activeSurfaceKeys),
      ),
    [substratePills, activeSurfaceKeys],
  );

  const areaOverhead = useMemo(
    () => resolveAreaOverhead(room?.prep_work),
    [room?.prep_work],
  );

  const workItemTableRows = useMemo(
    () =>
      buildWorkItemTableRows(workItemsRollup ?? null, {
        breakdown: areaCostBreakdown,
        overheadSettings: areaOverhead,
      }),
    [workItemsRollup, areaCostBreakdown, areaOverhead],
  );

  const displaySqFt = useMemo(() => {
    const total = totalSurfaceSqFt(areaSurfaces);
    return total > 0 ? total : null;
  }, [areaSurfaces]);

  const areaMiniQuote = useMemo((): AreaMiniQuoteDocument | null => {
    if (!areaCostBreakdown || !areaPreviewLineItems) return null;
    return buildAreaMiniQuote(
      areaPreviewLineItems,
      areaCostBreakdown,
      areaOverhead,
    );
  }, [areaCostBreakdown, areaPreviewLineItems, areaOverhead]);

  const updateAreaOverhead = (patch: Partial<AreaOverheadSettings>) => {
    onUpdate({
      prep_work: setAreaOverhead(room?.prep_work, patch),
    });
  };

  if (!room) return null;

  const handleSubstrateToggle = (
    substrate: AreaSubstrateDefinition,
    enabled: boolean,
  ) => {
    if (
      enabled &&
      substrate.id === "closets" &&
      !surfaceByKey.has("closet")
    ) {
      setClosetModalOpen(true);
      return;
    }

    for (const key of substrate.toggleKeys) {
      const hasSurface = surfaceByKey.has(key);
      if (enabled && !hasSurface) {
        onToggleSurface(key, true);
      } else if (!enabled && hasSurface) {
        onToggleSurface(key, false);
      }
    }
  };

  const detailSubstrate = detailSubstrateId
    ? findSubstrateDefinition(room?.prep_work, detailSubstrateId) ?? null
    : null;

  const areaNameInputWidthCh = Math.max((room.name || "Bedroom").length + 1, 9);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showClose={false}
          className={cn(
            "area-edit-modal left-[50%] !top-[2.5%] flex h-[min(94dvh,calc(100dvh-1.25rem))] w-[min(96vw,calc(100vw-1.25rem))] !max-w-[min(96vw,88rem)] !translate-x-[-50%] !translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:!top-[3%]",
            "data-[state=open]:slide-in-from-top-[2%] data-[state=closed]:slide-out-to-top-[2%]",
          )}
        >
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-3.5 text-left sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="sr-only">
                  Edit area: {room.name || `Area ${roomIndex + 1}`}
                </DialogTitle>
                <Input
                  id="area-name-title"
                  className="h-auto w-auto max-w-full border-0 bg-transparent p-0 text-left text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0 sm:text-3xl"
                  style={{ width: `${areaNameInputWidthCh}ch` }}
                  value={room.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  onFocus={selectInputContents}
                  onClick={selectInputContents}
                  placeholder="Bedroom"
                  aria-label="Area name"
                />
                <DialogDescription className="sr-only">
                  Area estimate editor for {room.name || `area ${roomIndex + 1}`}
                </DialogDescription>
              </div>
              {areaCostBreakdown ? (
                <AreaHeaderStats breakdown={areaCostBreakdown} />
              ) : null}
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="space-y-5">
              <div>
                <div className="overflow-hidden rounded-lg border border-border/60 bg-card/40 shadow-theme-sm">
                  <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1.45fr)_minmax(0,0.65fr)] divide-x divide-border/50">
                    <div className="flex min-w-0 flex-col">
                      <BandSectionHeader
                        description={BAND_SECTION_DESCRIPTIONS.areaDetails}
                      >
                        Area Details
                      </BandSectionHeader>
                      <div className="grid min-h-[6.75rem] min-w-0 grid-cols-[auto_minmax(0,1fr)] divide-x divide-border/50">
                        <div className="flex h-full min-h-0 shrink-0 flex-col gap-1 px-2.5 py-2 sm:px-3 sm:py-2.5">
                          <div className="flex flex-col gap-1">
                            {(
                              [
                                ["Length", "length_ft"],
                                ["Width", "width_ft"],
                                ["Height", "height_ft"],
                              ] as const
                            ).map(([label, field]) => (
                              <div
                                key={field}
                                className="flex items-center gap-1.5"
                              >
                                <Label
                                  htmlFor={`area-${field}`}
                                  className="w-11 shrink-0 text-[10px] font-medium text-muted-foreground"
                                >
                                  {label}
                                </Label>
                                <Input
                                  id={`area-${field}`}
                                  className="h-6 w-[2.75rem] px-1 text-center text-[11px] tabular-nums"
                                  type="number"
                                  min={0}
                                  step="0.1"
                                  value={room[field] ?? ""}
                                  onFocus={selectInputContents}
                                  onClick={selectInputContents}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    onUpdate({
                                      [field]: raw ? Number(raw) : null,
                                    });
                                  }}
                                />
                                <span className="w-3 shrink-0 text-[9px] text-muted-foreground/80">
                                  ft
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex min-h-0 flex-1 flex-col items-center justify-center border-t border-border/40 pt-1 text-center">
                            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                              Sq ft
                            </span>
                            <p className="mt-0.5 text-xl font-bold tabular-nums leading-none tracking-tight text-foreground sm:text-2xl">
                              {displaySqFt != null
                                ? displaySqFt.toLocaleString()
                                : "—"}
                            </p>
                            <p className="mt-1 text-[8px] leading-tight text-muted-foreground/80">
                              Total surface area
                            </p>
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-col justify-center overflow-hidden px-2.5 py-1.5 sm:px-3 sm:py-2">
                          {areaMiniQuote ? (
                            <AreaDetailsMiniQuote quote={areaMiniQuote} />
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col">
                      <BandSectionHeader
                        description={BAND_SECTION_DESCRIPTIONS.substrates}
                      >
                        Substrates
                      </BandSectionHeader>
                      <div className="grid min-h-[6.75rem] min-w-0 grid-cols-3 content-center gap-1 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        {substratePills.map((substrate) => (
                          <SubstratePill
                            key={substrate.id}
                            label={substrate.label}
                            active={isSubstrateActive(substrate, activeSurfaceKeys)}
                            onClick={() =>
                              handleSubstrateToggle(
                                substrate,
                                !isSubstrateActive(substrate, activeSurfaceKeys),
                              )
                            }
                            onRemove={
                              isCustomSubstrateId(substrate.id) &&
                              onRemoveCustomSubstrate
                                ? () =>
                                    onRemoveCustomSubstrate(
                                      substrate.id as CustomSubstrateId,
                                    )
                                : undefined
                            }
                          />
                        ))}
                        {onAddCustomSubstrate ? (
                          <button
                            type="button"
                            className={cn(
                              substratePillBaseClass,
                              "gap-0.5 border-dashed border-border/60 bg-background/60 text-muted-foreground hover:border-primary/35 hover:bg-muted/40 hover:text-foreground",
                            )}
                            onClick={() => setCustomSubstrateModalOpen(true)}
                          >
                            <Plus className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">Custom</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col">
                      <BandSectionHeader
                        description={BAND_SECTION_DESCRIPTIONS.sundries}
                        infoSide="left"
                      >
                        Sundries
                      </BandSectionHeader>
                      <SundriesControls
                        areaOverhead={areaOverhead}
                        onChange={updateAreaOverhead}
                        overheadCostAtCost={
                          areaCostBreakdown?.overheadCostAtCost
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {activeSubstrates.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Substrate pricing
                  </Label>
                  <WorkItemsTable
                    rows={workItemTableRows}
                    onRowClick={(substrateId) =>
                      setDetailSubstrateId(substrateId)
                    }
                    onMarginChange={onSubstrateMarginChange}
                    onCoatsChange={onSubstrateCoatsChange}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  rows={2}
                  className="min-h-[4.5rem] resize-none text-sm"
                  value={room.color_codes ?? ""}
                  onChange={(e) => onUpdate({ color_codes: e.target.value })}
                  placeholder="Extra details…"
                />
              </div>

            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-3 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive sm:mr-auto"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button type="button" size="sm" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save area"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubstrateDetailModal
        open={detailSubstrateId !== null}
        substrate={detailSubstrate}
        room={room}
        company={company}
        jobType={jobType}
        paintProducts={paintProducts}
        paintDefaults={paintDefaults}
        baselineSystems={baselineSystems}
        surfaceByKey={surfaceByKey}
        onOpenChange={(next) => {
          if (!next) setDetailSubstrateId(null);
        }}
        onUpdateSurface={onUpdateSurface}
        onResetSurfaceProduct={onResetSurfaceProduct}
        onEditCloset={() => setClosetModalOpen(true)}
        onScopeChange={(entries, options) => {
          if (!detailSubstrateId) return;
          let prepWork = room.prep_work;
          if (options?.registerAreaCustomLabel) {
            prepWork = addAreaCustomScopeLabel(
              prepWork,
              options.registerAreaCustomLabel,
              jobType,
            );
          }
          onUpdate({
            prep_work: setSubstrateScopeEntries(
              prepWork,
              detailSubstrateId,
              entries,
            ),
          });
        }}
        onSubstrateProductivityChange={
          detailSubstrateId && onSubstrateProductivityChange
            ? (patch) => onSubstrateProductivityChange(detailSubstrateId, patch)
            : undefined
        }
        onResetSubstrateProductivity={
          detailSubstrateId && onResetSubstrateProductivity
            ? () => onResetSubstrateProductivity(detailSubstrateId)
            : undefined
        }
        onSubstrateCoatsChange={
          detailSubstrateId && onSubstrateCoatsChange
            ? (coats) => onSubstrateCoatsChange(detailSubstrateId, coats)
            : undefined
        }
      />

      <CustomSubstrateNameModal
        open={customSubstrateModalOpen}
        onOpenChange={setCustomSubstrateModalOpen}
        onAdd={(label) => onAddCustomSubstrate?.(label)}
      />

      <ClosetDimensionsModal
        open={closetModalOpen}
        initial={closetInitial}
        onOpenChange={setClosetModalOpen}
        onConfirm={(dims) => {
          onConfirmCloset(dims);
        }}
        onCancel={() => {
          if (!closetSurface) {
            onToggleSurface("closet", false);
          }
        }}
      />
    </>
  );
}
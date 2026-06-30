"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { ClosetDimensionsModal } from "@/components/quotes/simple/ClosetDimensionsModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type {
  QuotePaintDefaultInput,
  RoomInput,
  SurfaceInput,
} from "@/app/app/(portal)/quotes/actions";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import {
  AREA_SURFACE_CATALOG,
  PAINT_DEFAULT_OPTIONS,
  areaSurfaceByKey,
  type AreaSurfaceDefinition,
  type AreaSurfaceKey,
} from "@/lib/quotes/area-surface-catalog";
import {
  parseClosetDimensions,
  type ClosetDimensions,
} from "@/lib/quotes/area-surface-dimensions";
import {
  paintDefaultsRecord,
  productsForSurfaceKind,
  resolveSurfaceProductId,
} from "@/lib/quotes/paint-defaults";
import { estimateSurfaceMaterialCostAtCost } from "@/lib/quotes/area-pricing";
import type { AreaCostBreakdown } from "@/lib/quotes/area-pricing";
import {
  estimateSurfaceLaborHours,
  formatLaborHours,
  getLaborCostPerHour,
  resolveSurfaceLaborDefaultsFromCompany,
} from "@/lib/quotes/surface-productivity";
import {
  computeSurfaceGallons,
  formatGallons,
  surfaceSupportsGallons,
} from "@/lib/quotes/surface-gallons";
import {
  parseScopeLines,
  scopeLibraryForJobType,
} from "@/lib/quotes/scope-library";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Company, QuoteJobType } from "@/types/database";

type AreaEditModalProps = {
  open: boolean;
  room: RoomInput | null;
  roomIndex: number;
  areaSubtotal: number;
  areaCostBreakdown?: AreaCostBreakdown | null;
  jobType: QuoteJobType;
  company: Company;
  areaSurfaces: SurfaceInput[];
  paintDefaults: QuotePaintDefaultInput[];
  paintProducts: CompanyPaintProductRow[];
  onOpenChange: (open: boolean) => void;
  onUpdate: (patch: Partial<RoomInput>) => void;
  onToggleSurface: (surfaceKey: AreaSurfaceKey, enabled: boolean) => void;
  onConfirmCloset: (dims: ClosetDimensions) => void;
  onUpdateSurface: (
    surfaceKey: AreaSurfaceKey,
    patch: Partial<SurfaceInput>,
  ) => void;
  onSetPaintDefault: (
    surfaceType: AreaSurfaceDefinition["paint_default_type"],
    productId: string | null,
  ) => void;
  onResetSurfaceProduct: (surfaceKey: AreaSurfaceKey) => void;
  onToggleScope: (label: string, enabled: boolean) => void;
  onToggleScopeCategory: (labels: string[], enabled: boolean) => void;
  onApplyDimensions: () => void;
  isSaving?: boolean;
  onSave: () => void;
  onDelete: () => void;
};

function ScopeCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition",
        checked
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card hover:bg-muted/40",
      )}
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 shrink-0 rounded border-border accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="leading-snug text-foreground">{label}</span>
    </label>
  );
}

function CategorySelectAll({
  label,
  items,
  scopeLines,
  onToggleAll,
}: {
  label: string;
  items: { label: string }[];
  scopeLines: string[];
  onToggleAll: (enabled: boolean) => void;
}) {
  const checkedCount = items.filter((item) =>
    scopeLines.includes(item.label),
  ).length;
  const allChecked = checkedCount === items.length && items.length > 0;
  const someChecked = checkedCount > 0 && !allChecked;

  return (
    <label className="mb-1 flex cursor-pointer items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 rounded border-border accent-primary"
        checked={allChecked}
        ref={(el) => {
          if (el) el.indeterminate = someChecked;
        }}
        onChange={(e) => onToggleAll(e.target.checked)}
      />
      {label}
      <span className="font-normal normal-case tracking-normal">
        ({checkedCount}/{items.length})
      </span>
    </label>
  );
}

function SurfaceRow({
  definition,
  surface,
  room,
  company,
  jobType,
  products,
  defaultProductId,
  onToggle,
  onUpdate,
  onResetProduct,
  onEditCloset,
  locked = false,
  companion = false,
}: {
  definition: AreaSurfaceDefinition;
  surface: SurfaceInput | null;
  room: RoomInput;
  company: Company;
  jobType: QuoteJobType;
  products: CompanyPaintProductRow[];
  defaultProductId: string | null;
  onToggle: (enabled: boolean) => void;
  onUpdate: (patch: Partial<SurfaceInput>) => void;
  onResetProduct: () => void;
  onEditCloset?: () => void;
  locked?: boolean;
  companion?: boolean;
}) {
  const enabled = locked || Boolean(surface);
  const coats = surface?.coats ?? room.coats ?? 2;
  const sqFt = surface?.sq_ft ?? 0;
  const productId =
    surface?.company_paint_product_id ?? defaultProductId ?? null;
  const product = productId
    ? products.find((row) => row.id === productId) ?? null
    : null;
  const isOverridden =
    Boolean(surface?.product_override) ||
    (surface?.company_paint_product_id != null &&
      surface.company_paint_product_id !== defaultProductId);

  const gallons = surface
    ? computeSurfaceGallons(
        sqFt,
        coats,
        surface.rate_type ?? definition.rate_type,
        product,
        company,
        {
          surfaceType: definition.surface_type,
          jobType,
        },
      )
    : 0;

  const laborDefaults = resolveSurfaceLaborDefaultsFromCompany(company);
  const laborHours =
    surface && enabled
      ? estimateSurfaceLaborHours(
          {
            surface_type: definition.surface_type,
            rate_type: surface.rate_type ?? definition.rate_type,
            sq_ft: sqFt,
            coats,
          },
          jobType,
          laborDefaults,
        )
      : 0;
  const materialCostAtCost =
    surface && enabled
      ? estimateSurfaceMaterialCostAtCost(
          {
            surface_type: definition.surface_type,
            rate_type: surface.rate_type ?? definition.rate_type,
            sq_ft: sqFt,
            coats,
          },
          product,
          company,
          jobType,
        )
      : 0;
  const laborRate = getLaborCostPerHour(company);
  const laborCostAtCost =
    laborHours > 0 ? Math.round(laborHours * laborRate * 100) / 100 : 0;

  const qtyLabel =
    definition.rate_type === "linear"
      ? "Lin ft"
      : definition.rate_type === "each"
        ? "Count"
        : "Sq ft";

  const filteredProducts = productsForSurfaceKind(
    products,
    definition.paint_default_type,
  );

  const closetDims =
    definition.key === "closet" ? parseClosetDimensions(surface?.notes) : null;

  return (
    <div
      className={cn(
        "grid items-center gap-2 rounded-lg border px-2 py-2 transition sm:grid-cols-[minmax(5.5rem,auto)_minmax(4rem,0.85fr)_minmax(3rem,0.55fr)_minmax(3rem,0.5fr)_minmax(3rem,0.5fr)_minmax(0,1.35fr)_auto] sm:gap-1.5 sm:px-3",
        companion && "ml-4 border-l-2 border-primary/25",
        enabled
          ? "border-border/70 bg-background/50"
          : "border-border/40 bg-muted/15 opacity-80",
      )}
    >
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded border-border accent-primary"
          checked={enabled}
          disabled={locked}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="text-sm font-medium text-foreground">
          {definition.label}
        </span>
      </label>

      <div className="space-y-0.5 sm:contents">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground sm:sr-only">
            {qtyLabel}
          </Label>
          <Input
            className="h-8 text-xs"
            type="number"
            min={0}
            disabled={
              !enabled ||
              definition.key === "closet" ||
              definition.key === "closet-ceiling"
            }
            value={enabled ? sqFt || "" : ""}
            onChange={(e) =>
              onUpdate({ sq_ft: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground sm:sr-only">
            Coats
          </Label>
          <Input
            className="h-8 text-xs"
            type="number"
            min={1}
            disabled={!enabled}
            value={enabled ? coats : ""}
            onChange={(e) =>
              onUpdate({ coats: Number(e.target.value) || 1 })
            }
          />
        </div>
        <div className="flex h-8 flex-col justify-center text-xs tabular-nums text-muted-foreground">
          {enabled &&
          (surfaceSupportsGallons(definition.rate_type) ||
            definition.rate_type === "linear" ||
            definition.rate_type === "each") &&
          gallons > 0 ? (
            <>
              <span>{formatGallons(gallons)} gal</span>
              {materialCostAtCost > 0 ? (
                <span className="text-[10px]">{formatCurrency(materialCostAtCost)}</span>
              ) : null}
            </>
          ) : enabled ? (
            <span className="text-muted-foreground/60">—</span>
          ) : null}
        </div>
        <div className="flex h-8 flex-col justify-center text-xs tabular-nums text-muted-foreground">
          {enabled && laborHours > 0 ? (
            <>
              <span>{formatLaborHours(laborHours)}</span>
              <span className="text-[10px]">{formatCurrency(laborCostAtCost)}</span>
            </>
          ) : enabled ? (
            <span className="text-muted-foreground/60">—</span>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1 sm:col-span-2">
        <Select
          value={productId ?? "__none__"}
          onValueChange={(value) => {
            if (!enabled) return;
            onUpdate({
              company_paint_product_id: value === "__none__" ? null : value,
              product_override: true,
            });
          }}
          disabled={!enabled || filteredProducts.length === 0}
        >
          <SelectTrigger
            className={cn(
              "h-8 min-w-0 flex-1 text-xs",
              isOverridden && "border-amber-500/50 bg-amber-500/5",
            )}
          >
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No product</SelectItem>
            {filteredProducts.map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {row.name}
                {row.unit_price > 0
                  ? ` · ${formatCurrency(row.unit_price)}/gal`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isOverridden ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            title="Reset to project default"
            onClick={onResetProduct}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {enabled && definition.key === "closet" && onEditCloset ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            title={
              closetDims
                ? `${closetDims.length_ft}×${closetDims.width_ft}×${closetDims.height_ft} ft`
                : "Set closet size"
            }
            onClick={onEditCloset}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AreaEditModal({
  open,
  room,
  roomIndex,
  areaSubtotal,
  areaCostBreakdown = null,
  jobType,
  company,
  areaSurfaces,
  paintDefaults,
  paintProducts,
  onOpenChange,
  onUpdate,
  onToggleSurface,
  onConfirmCloset,
  onUpdateSurface,
  onSetPaintDefault,
  onResetSurfaceProduct,
  onToggleScope,
  onToggleScopeCategory,
  onApplyDimensions,
  isSaving = false,
  onSave,
  onDelete,
}: AreaEditModalProps) {
  const lastAutoCalcKey = useRef("");
  const [closetModalOpen, setClosetModalOpen] = useState(false);

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

  const defaultsRecord = useMemo(
    () => paintDefaultsRecord(paintDefaults),
    [paintDefaults],
  );

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

  const totalGallons = useMemo(() => {
    let sum = 0;
    for (const surface of areaSurfaces) {
      const productId = resolveSurfaceProductId(surface, defaultsRecord);
      const product = productId
        ? paintProducts.find((row) => row.id === productId) ?? null
        : null;
      sum += computeSurfaceGallons(
        surface.sq_ft,
        surface.coats,
        surface.rate_type ?? "sqft",
        product,
        company,
        { surfaceType: surface.surface_type, jobType },
      );
    }
    return Math.round(sum * 100) / 100;
  }, [areaSurfaces, company, defaultsRecord, jobType, paintProducts]);

  const surfaceLaborDefaults = useMemo(
    () => resolveSurfaceLaborDefaultsFromCompany(company),
    [company],
  );

  const totalLaborHours = useMemo(() => {
    let sum = 0;
    for (const surface of areaSurfaces) {
      sum += estimateSurfaceLaborHours(surface, jobType, surfaceLaborDefaults);
    }
    return Math.round(sum * 100) / 100;
  }, [areaSurfaces, jobType, surfaceLaborDefaults]);

  if (!room) return null;

  const scopeLines = parseScopeLines(room.prep_work);
  const scopeLibrary = scopeLibraryForJobType(jobType);
  const prepItems = scopeLibrary.filter((item) => item.category === "prep");
  const paintItems = scopeLibrary.filter((item) => item.category === "paint");
  const extraItems = scopeLibrary.filter((item) => item.category === "extras");

  const structureSurfaces = AREA_SURFACE_CATALOG.filter((row) =>
    ["wall-1", "wall-2", "wall-3", "wall-4", "ceiling", "floor", "door", "closet"].includes(
      row.key,
    ),
  );
  const extraSurfaces = AREA_SURFACE_CATALOG.filter((row) =>
    ["trim", "window"].includes(row.key),
  );
  const closetCeilingDef = areaSurfaceByKey("closet-ceiling");
  const hasCloset = surfaceByKey.has("closet");

  const handleSurfaceToggle = (
    definition: AreaSurfaceDefinition,
    enabled: boolean,
  ) => {
    if (enabled && definition.opensClosetModal && !surfaceByKey.has("closet")) {
      setClosetModalOpen(true);
      return;
    }
    onToggleSurface(definition.key, enabled);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "area-edit-modal left-[50%] !top-[4%] flex w-[calc(100%-1.5rem)] max-h-[min(88vh,44rem)] !max-w-6xl !translate-x-[-50%] !translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:!top-[5%]",
            "data-[state=open]:slide-in-from-top-[2%] data-[state=closed]:slide-out-to-top-[2%]",
          )}
        >
          <DialogHeader className="shrink-0 space-y-0 border-b border-border px-5 py-3 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
              <div className="min-w-0">
                <DialogTitle className="text-lg">
                  {room.name || `Area ${roomIndex + 1}`}
                </DialogTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ~{formatGallons(totalGallons)} gal ·{" "}
                  {formatLaborHours(totalLaborHours)} labor
                  {areaCostBreakdown ? (
                    <>
                      {" "}
                      · direct {formatCurrency(areaCostBreakdown.directCost)} ·
                      bid {formatCurrency(areaSubtotal)}
                    </>
                  ) : (
                    <> · {formatCurrency(areaSubtotal)} bid</>
                  )}
                </p>
              </div>
              <div className="min-w-[10rem] flex-1 space-y-1 sm:max-w-xs">
                <Label className="text-xs text-muted-foreground">Area name</Label>
                <Input
                  className="h-9"
                  value={room.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="Living Room"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dimensions
                </Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {(
                    [
                      ["Length", "length_ft"],
                      ["Width", "width_ft"],
                      ["Height", "height_ft"],
                      ["Sq ft", "sq_ft"],
                      ["Coats", "coats"],
                    ] as const
                  ).map(([label, field]) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {label}
                      </Label>
                      <Input
                        className="h-9"
                        type="number"
                        min={field === "coats" ? 1 : 0}
                        value={
                          field === "sq_ft"
                            ? room.sq_ft || ""
                            : field === "coats"
                              ? room.coats
                              : (room[field] ?? "")
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (field === "sq_ft") {
                            onUpdate({ sq_ft: Number(raw) });
                          } else if (field === "coats") {
                            onUpdate({ coats: Number(raw) });
                          } else {
                            onUpdate({
                              [field]: raw ? Number(raw) : null,
                            });
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Room size auto-fills each wall, ceiling, and floor. Closet
                  adds interior walls and ceiling from closet dimensions.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Project paint defaults
                  </Label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {PAINT_DEFAULT_OPTIONS.map((option) => {
                    const def = defaultsRecord[option.surface_type];
                    const filtered = productsForSurfaceKind(
                      paintProducts,
                      option.surface_type,
                    );
                    return (
                      <div key={option.surface_type} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">
                          {option.label}
                        </Label>
                        <Select
                          value={def?.company_paint_product_id ?? "__none__"}
                          onValueChange={(value) =>
                            onSetPaintDefault(
                              option.surface_type,
                              value === "__none__" ? null : value,
                            )
                          }
                          disabled={filtered.length === 0}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Not set</SelectItem>
                            {filtered.map((row) => (
                              <SelectItem key={row.id} value={row.id}>
                                {row.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Surfaces in this area
                  </Label>
                  <p className="hidden text-[10px] text-muted-foreground sm:block">
                    Gal · Labor hr
                  </p>
                </div>
                <div className="space-y-1.5">
                  {structureSurfaces.map((definition) => (
                    <Fragment key={definition.key}>
                      <SurfaceRow
                        definition={definition}
                        surface={surfaceByKey.get(definition.key) ?? null}
                        room={room}
                        company={company}
                        jobType={jobType}
                        products={paintProducts}
                        defaultProductId={
                          defaultsRecord[definition.paint_default_type]
                            ?.company_paint_product_id ?? null
                        }
                        onToggle={(enabled) =>
                          handleSurfaceToggle(definition, enabled)
                        }
                        onUpdate={(patch) =>
                          onUpdateSurface(definition.key, patch)
                        }
                        onResetProduct={() =>
                          onResetSurfaceProduct(definition.key)
                        }
                        onEditCloset={
                          definition.key === "closet"
                            ? () => setClosetModalOpen(true)
                            : undefined
                        }
                      />
                      {definition.key === "closet" &&
                      hasCloset &&
                      closetCeilingDef ? (
                        <SurfaceRow
                          definition={closetCeilingDef}
                          surface={
                            surfaceByKey.get("closet-ceiling") ?? null
                          }
                          room={room}
                          company={company}
                          jobType={jobType}
                          products={paintProducts}
                          defaultProductId={
                            defaultsRecord[closetCeilingDef.paint_default_type]
                              ?.company_paint_product_id ?? null
                          }
                          locked
                          companion
                          onToggle={() => {}}
                          onUpdate={(patch) =>
                            onUpdateSurface("closet-ceiling", patch)
                          }
                          onResetProduct={() =>
                            onResetSurfaceProduct("closet-ceiling")
                          }
                        />
                      ) : null}
                    </Fragment>
                  ))}
                </div>
                {extraSurfaces.length > 0 ? (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Optional
                    </p>
                    {extraSurfaces.map((definition) => (
                      <SurfaceRow
                        key={definition.key}
                        definition={definition}
                        surface={surfaceByKey.get(definition.key) ?? null}
                        room={room}
                        company={company}
                        jobType={jobType}
                        products={paintProducts}
                        defaultProductId={
                          defaultsRecord[definition.paint_default_type]
                            ?.company_paint_product_id ?? null
                        }
                        onToggle={(enabled) =>
                          handleSurfaceToggle(definition, enabled)
                        }
                        onUpdate={(patch) =>
                          onUpdateSurface(definition.key, patch)
                        }
                        onResetProduct={() =>
                          onResetSurfaceProduct(definition.key)
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Condition
                  </Label>
                  <Select
                    value={room.condition}
                    onValueChange={(v) => onUpdate({ condition: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Scope of work
                </Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <CategorySelectAll
                      label="Prep"
                      items={prepItems}
                      scopeLines={scopeLines}
                      onToggleAll={(enabled) =>
                        onToggleScopeCategory(
                          prepItems.map((item) => item.label),
                          enabled,
                        )
                      }
                    />
                    <div className="grid gap-1.5">
                      {prepItems.map((item) => (
                        <ScopeCheckbox
                          key={item.id}
                          label={item.label}
                          checked={scopeLines.includes(item.label)}
                          onChange={(checked) =>
                            onToggleScope(item.label, checked)
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <CategorySelectAll
                      label="Painting"
                      items={paintItems}
                      scopeLines={scopeLines}
                      onToggleAll={(enabled) =>
                        onToggleScopeCategory(
                          paintItems.map((item) => item.label),
                          enabled,
                        )
                      }
                    />
                    <div className="grid gap-1.5">
                      {paintItems.map((item) => (
                        <ScopeCheckbox
                          key={item.id}
                          label={item.label}
                          checked={scopeLines.includes(item.label)}
                          onChange={(checked) =>
                            onToggleScope(item.label, checked)
                          }
                        />
                      ))}
                    </div>
                  </div>
                  {extraItems.length > 0 ? (
                    <div className="space-y-1.5">
                      <CategorySelectAll
                        label="Extras"
                        items={extraItems}
                        scopeLines={scopeLines}
                        onToggleAll={(enabled) =>
                          onToggleScopeCategory(
                            extraItems.map((item) => item.label),
                            enabled,
                          )
                        }
                      />
                      <div className="grid gap-1.5">
                        {extraItems.map((item) => (
                          <ScopeCheckbox
                            key={item.id}
                            label={item.label}
                            checked={scopeLines.includes(item.label)}
                            onChange={(checked) =>
                              onToggleScope(item.label, checked)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {areaCostBreakdown ? (
            <div className="shrink-0 border-t border-border bg-muted/20 px-5 py-3 text-xs sm:px-6">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Materials (your cost)</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(areaCostBreakdown.materialCostAtCost)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    Labor ({formatLaborHours(areaCostBreakdown.totalLaborHours)} @{" "}
                    {formatCurrency(getLaborCostPerHour(company))}/hr)
                  </p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(areaCostBreakdown.laborCostAtCost)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Direct cost</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(areaCostBreakdown.directCost)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    Bid (+{areaCostBreakdown.overheadPct}% overhead,{" "}
                    {areaCostBreakdown.grossMarginPct}% margin)
                  </p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(areaCostBreakdown.bidPrice)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

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
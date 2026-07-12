"use client";

import { Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  QuotePaintDefaultInput,
  RoomInput,
  SurfaceInput,
} from "@/app/app/(portal)/quotes/actions";
import { formatPaintProductLabel } from "@/lib/paint-library/product-label";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import type { AreaSurfaceDefinition } from "@/lib/quotes/area-surface-catalog";
import { parseClosetDimensions } from "@/lib/quotes/area-surface-dimensions";
import type { BaselinePaintSystemInput } from "@/lib/quotes/baseline-paint";
import { computeMaterialBreakdown } from "@/lib/quotes/estimation/paint-products";
import { computePaintableSqFt } from "@/lib/quotes/paintable-sqft";
import { resolveSurfaceLaborOverride } from "@/lib/quotes/surface-labor-defaults";
import {
  defaultPrimerProductIdForWindow,
  productsForPaintRole,
  productsForSurfaceKind,
} from "@/lib/quotes/paint-defaults";
import { resolveSurfacePaintConfig } from "@/lib/quotes/resolve-surface-paint";
import { ProductionRateEditor } from "@/components/quotes/simple/ProductionRateEditor";
import type { AreaSubstrateId } from "@/lib/quotes/area-substrates";

import {
  mergeSurfaceOverrideNotes,
  parseSurfaceFieldOverrides,
  resolveEffectiveSurfaceLaborOverride,
  resolveGallonsForSurface,
  resolveLaborHoursForSurface,
  resolvePrepHoursForSurface,
  surfaceProductivityOverridesFromNotes,
} from "@/lib/quotes/surface-overrides";
import {
  formatLaborHours,
  getLaborCostPerHour,
  resolveSurfaceLaborDefaultsFromCompany,
} from "@/lib/quotes/surface-productivity";
import { formatGallons, surfaceSupportsGallons } from "@/lib/quotes/surface-gallons";
import { formatCurrency, cn } from "@/lib/utils";
import type { Company, QuoteJobType } from "@/types/database";

function editorPaintableSqFt(
  surface: SurfaceInput,
  company: Company,
  jobType: QuoteJobType,
): number {
  const laborDefaults = resolveSurfaceLaborDefaultsFromCompany(company);
  const profile = resolveSurfaceLaborOverride(
    surface.surface_type,
    jobType,
    laborDefaults,
  );
  if (surface.rate_type === "sqft" && surface.sq_ft > 0) {
    return surface.sq_ft;
  }
  return computePaintableSqFt(surface, profile);
}

export const WALL_SURFACE_KEYS = [
  "wall-1",
  "wall-2",
  "wall-3",
  "wall-4",
] as const;

export function SurfaceEditorRow({
  definition,
  surface,
  room,
  company,
  jobType,
  products,
  defaultProductId,
  onUpdate,
  onResetProduct,
  onEditCloset,
  baselineSystems,
  paintDefaults,
  locked = false,
  companion = false,
  hideProduct = false,
  displayLabel,
  substrateId = null,
  showProductionRate = true,
}: {
  definition: AreaSurfaceDefinition;
  surface: SurfaceInput | null;
  room: RoomInput;
  company: Company;
  jobType: QuoteJobType;
  products: CompanyPaintProductRow[];
  defaultProductId: string | null;
  onUpdate: (patch: Partial<SurfaceInput>) => void;
  onResetProduct: () => void;
  onEditCloset?: () => void;
  baselineSystems?: BaselinePaintSystemInput[];
  paintDefaults?: QuotePaintDefaultInput[];
  locked?: boolean;
  companion?: boolean;
  hideProduct?: boolean;
  displayLabel?: string;
  substrateId?: AreaSubstrateId | null;
  showProductionRate?: boolean;
}) {
  const enabled = Boolean(surface);
  const coats = surface?.coats ?? room.coats ?? 2;
  const sqFt = surface?.sq_ft ?? 0;
  const overrides = parseSurfaceFieldOverrides(surface?.notes);
  const usesDualPaint = definition.key === "window";
  const defaultPrimerProductId = defaultPrimerProductIdForWindow(
    baselineSystems,
    jobType,
  );
  const storedProductId =
    surface?.company_paint_product_id ?? defaultProductId ?? null;
  const storedProduct = storedProductId
    ? products.find((row) => row.id === storedProductId) ?? null
    : null;
  const legacyPrimerInTopcoatSlot =
    usesDualPaint && storedProduct?.role === "primer";
  const topcoatId = legacyPrimerInTopcoatSlot
    ? (defaultProductId ?? null)
    : storedProductId;
  const primerId =
    overrides.primerProductId ??
    (legacyPrimerInTopcoatSlot ? storedProductId : null) ??
    defaultPrimerProductId;
  const topcoatProduct = topcoatId
    ? products.find((row) => row.id === topcoatId) ?? null
    : null;
  const primerProduct = primerId
    ? products.find((row) => row.id === primerId) ?? null
    : null;
  const product = usesDualPaint ? topcoatProduct : storedProduct;
  const productId = usesDualPaint ? topcoatId : storedProductId;
  const isOverridden =
    Boolean(surface?.product_override) ||
    (usesDualPaint
      ? (surface?.company_paint_product_id != null &&
          surface.company_paint_product_id !== defaultProductId) ||
        (overrides.primerProductId != null &&
          overrides.primerProductId !== defaultPrimerProductId)
      : surface?.company_paint_product_id != null &&
        surface.company_paint_product_id !== defaultProductId);

  const laborDefaults = resolveSurfaceLaborDefaultsFromCompany(company);
  const surfaceShape = surface
    ? {
        surface_type: definition.surface_type,
        rate_type: surface.rate_type ?? definition.rate_type,
        sq_ft: sqFt,
        coats,
        notes: surface.notes,
      }
    : null;

  const productsById = new Map(products.map((row) => [row.id, row]));
  const windowPaintConfig =
    usesDualPaint && enabled && surface
      ? resolveSurfacePaintConfig(surface, {
          jobType,
          baselineSystems,
          paintDefaults,
          productsById,
        })
      : null;
  const gallons =
    surfaceShape && enabled
      ? overrides.gallons != null
        ? resolveGallonsForSurface(surfaceShape, product, company, jobType)
        : usesDualPaint && windowPaintConfig && surface
          ? (() => {
              const paintableSqFt = editorPaintableSqFt(surface, company, jobType);
              if (paintableSqFt <= 0) return 0;
              return computeMaterialBreakdown(
                paintableSqFt,
                windowPaintConfig,
                company,
                0,
              ).totalGallons;
            })()
          : resolveGallonsForSurface(surfaceShape, product, company, jobType)
      : 0;
  const laborHours =
    surfaceShape && enabled
      ? resolveLaborHoursForSurface(surfaceShape, jobType, laborDefaults, {
          prepWork: room.prep_work,
          substrateId,
        })
      : 0;
  const storedSurfaceProductivity = surfaceProductivityOverridesFromNotes(
    surface?.notes,
  );
  const effectiveProductivity =
    surfaceShape && enabled
      ? resolveEffectiveSurfaceLaborOverride(surfaceShape, jobType, {
          surfaceLaborDefaults: laborDefaults,
          prepWork: room.prep_work,
          substrateId,
        })
      : null;
  const hasManualLaborHours = overrides.laborHours != null;
  const prepHours =
    surfaceShape && enabled ? resolvePrepHoursForSurface(surfaceShape) : 0;

  const materialCostAtCost =
    surfaceShape && enabled
      ? overrides.gallons != null && product
        ? gallons > 0 && product.unit_cost > 0
          ? Math.round(gallons * product.unit_cost * 100) / 100
          : 0
        : usesDualPaint && windowPaintConfig && surface
          ? (() => {
              const paintableSqFt = editorPaintableSqFt(surface, company, jobType);
              if (paintableSqFt <= 0) return 0;
              const breakdown = computeMaterialBreakdown(
                paintableSqFt,
                windowPaintConfig,
                company,
                0,
              );
              return Math.round(breakdown.totalMaterialCost * 100) / 100;
            })()
          : product && gallons > 0 && product.unit_cost > 0
            ? Math.round(gallons * product.unit_cost * 100) / 100
            : 0
      : 0;
  const laborRate = getLaborCostPerHour(company);
  const prepRate =
    (company.labor_rates as Record<string, number> | null)?.prep ?? 40;
  const laborCostAtCost =
    laborHours > 0 ? Math.round(laborHours * laborRate * 100) / 100 : 0;
  const prepCostAtCost =
    prepHours > 0 ? Math.round(prepHours * prepRate * 100) / 100 : 0;

  const qtyLabel =
    definition.rate_type === "linear"
      ? "Lin ft"
      : definition.rate_type === "each"
        ? "Count"
        : "Sq ft";

  const primerProducts = productsForPaintRole(
    products,
    jobType,
    "primer",
    primerId,
  );
  const topcoatProducts = usesDualPaint
    ? productsForPaintRole(products, jobType, "topcoat", topcoatId)
    : productsForSurfaceKind(
        products,
        definition.paint_default_type,
        jobType,
      );

  const closetDims =
    definition.key === "closet" ? parseClosetDimensions(surface?.notes) : null;

  const rowLabel = displayLabel ?? definition.label;
  const showGallons =
    enabled &&
    !hideProduct &&
    (surfaceSupportsGallons(definition.rate_type) ||
      definition.rate_type === "linear" ||
      definition.rate_type === "each");

  const updateOverride = (patch: {
    laborHours?: number | null;
    prepHours?: number | null;
    gallons?: number | null;
    primerProductId?: string | null;
    sqFtPerLaborHour?: number | null;
    linearFtPerLaborHour?: number | null;
    hoursPerUnit?: number | null;
  }) => {
    onUpdate({
      notes: mergeSurfaceOverrideNotes(surface?.notes, patch),
    });
  };

  const rateType =
    (surface?.rate_type ?? definition.rate_type) as "sqft" | "linear" | "each";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-background/50 p-3 transition sm:p-4",
        companion && "ml-0 border-l-4 border-l-primary/30 sm:ml-2",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{rowLabel}</span>
        {enabled && definition.key === "closet" && onEditCloset ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onEditCloset}
          >
            <Pencil className="h-3.5 w-3.5" />
            {closetDims
              ? `${closetDims.length_ft}×${closetDims.width_ft}×${closetDims.height_ft} ft`
              : "Set size"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{qtyLabel}</Label>
          <Input
            className="h-9"
            type="number"
            min={0}
            disabled={
              !enabled ||
              locked ||
              definition.key === "closet" ||
              definition.key === "closet-ceiling"
            }
            value={enabled ? sqFt || "" : ""}
            onChange={(e) => onUpdate({ sq_ft: Number(e.target.value) || 0 })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Coats</Label>
          <Input
            className="h-9"
            type="number"
            min={1}
            disabled={!enabled || locked}
            value={enabled ? coats : ""}
            onChange={(e) => onUpdate({ coats: Number(e.target.value) || 1 })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            Painting (hr)
          </Label>
          <Input
            className="h-9 tabular-nums"
            type="number"
            min={0}
            step={0.25}
            disabled={!enabled || locked}
            value={enabled ? laborHours || "" : ""}
            onChange={(e) => {
              const raw = e.target.value;
              updateOverride({
                laborHours: raw === "" ? null : Number(raw) || 0,
              });
            }}
          />
          {enabled && laborCostAtCost > 0 ? (
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {formatCurrency(laborCostAtCost)} at cost
              {hasManualLaborHours ? " · manual override" : ""}
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Prep (hr)</Label>
          <Input
            className="h-9 tabular-nums"
            type="number"
            min={0}
            step={0.25}
            disabled={!enabled || locked}
            value={enabled ? prepHours || "" : ""}
            onChange={(e) => {
              const raw = e.target.value;
              updateOverride({
                prepHours: raw === "" ? null : Number(raw) || 0,
              });
            }}
          />
          {enabled && prepCostAtCost > 0 ? (
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {formatCurrency(prepCostAtCost)} at cost
            </p>
          ) : null}
        </div>

        {showGallons ? (
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Gallons</Label>
            <Input
              className="h-9 tabular-nums"
              type="number"
              min={0}
              step={0.01}
              disabled={!enabled || locked}
              value={enabled ? gallons || "" : ""}
              onChange={(e) => {
                const raw = e.target.value;
                updateOverride({
                  gallons: raw === "" ? null : Number(raw) || 0,
                });
              }}
            />
            {enabled && materialCostAtCost > 0 ? (
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {formatCurrency(materialCostAtCost)} at cost
              </p>
            ) : null}
          </div>
        ) : enabled && !hideProduct ? (
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Gallons</Label>
            <p className="flex h-9 items-center text-sm text-muted-foreground/70">
              —
            </p>
          </div>
        ) : null}
      </div>

      {enabled &&
      showProductionRate &&
      !locked &&
      effectiveProductivity &&
      substrateId == null ? (
        <div className="mt-3">
          <ProductionRateEditor
            compact
            surfaceType={definition.surface_type}
            rateType={rateType}
            jobType={jobType}
            company={company}
            effective={effectiveProductivity}
            stored={storedSurfaceProductivity}
            onChange={(patch) => {
              updateOverride({
                ...patch,
                laborHours: null,
              });
            }}
            onReset={
              storedSurfaceProductivity
                ? () => {
                    updateOverride({
                      sqFtPerLaborHour: null,
                      linearFtPerLaborHour: null,
                      hoursPerUnit: null,
                      laborHours: null,
                    });
                  }
                : undefined
            }
          />
        </div>
      ) : null}

      {!hideProduct ? (
        <div className="mt-3 space-y-3">
          {usesDualPaint ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1">
                <Label className="text-[11px] text-muted-foreground">Primer</Label>
                <Select
                  value={primerId ?? "__none__"}
                  onValueChange={(value) => {
                    if (!enabled) return;
                    onUpdate({
                      notes: mergeSurfaceOverrideNotes(surface?.notes, {
                        primerProductId: value === "__none__" ? null : value,
                      }),
                      product_override: true,
                    });
                  }}
                  disabled={!enabled || locked || primerProducts.length === 0}
                >
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder="None — topcoat only" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None — topcoat only</SelectItem>
                    {primerProducts.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {formatPaintProductLabel(row)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {primerProduct ? (
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {formatPaintProductLabel(primerProduct)}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Topcoat
                </Label>
                <Select
                  value={topcoatId ?? "__none__"}
                  onValueChange={(value) => {
                    if (!enabled) return;
                    onUpdate({
                      company_paint_product_id:
                        value === "__none__" ? null : value,
                      product_override: true,
                    });
                  }}
                  disabled={!enabled || locked || topcoatProducts.length === 0}
                >
                  <SelectTrigger
                    className={cn(
                      "h-9 w-full text-sm",
                      isOverridden && "border-amber-500/50 bg-amber-500/5",
                    )}
                  >
                    <SelectValue placeholder="Select topcoat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No topcoat</SelectItem>
                    {topcoatProducts.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {formatPaintProductLabel(row)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {topcoatProduct ? (
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {formatPaintProductLabel(topcoatProduct)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Product
                </Label>
                <Select
                  value={productId ?? "__none__"}
                  onValueChange={(value) => {
                    if (!enabled) return;
                    onUpdate({
                      company_paint_product_id:
                        value === "__none__" ? null : value,
                      product_override: true,
                    });
                  }}
                  disabled={!enabled || locked || topcoatProducts.length === 0}
                >
                  <SelectTrigger
                    className={cn(
                      "h-9 w-full text-sm",
                      isOverridden && "border-amber-500/50 bg-amber-500/5",
                    )}
                  >
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No product</SelectItem>
                    {topcoatProducts.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {formatPaintProductLabel(row)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {isOverridden ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground"
                title="Reset to project default"
                onClick={onResetProduct}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset products
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Labor only — no paint product</p>
      )}

      {enabled &&
      (overrides.laborHours != null ||
        overrides.prepHours != null ||
        overrides.gallons != null) ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Custom override active. Clear a field to use auto estimates (
          {formatLaborHours(laborHours)} painting
          {prepHours > 0 ? ` · ${formatLaborHours(prepHours)} prep` : ""}
          {showGallons && gallons > 0 ? ` · ${formatGallons(gallons)}` : ""}).
        </p>
      ) : null}
    </div>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  QuotePaintDefaultInput,
  RoomInput,
  SurfaceInput,
} from "@/app/app/(portal)/quotes/actions";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import { resolveAreaSurfaceDefinition } from "@/lib/quotes/area-custom-substrates";
import {
  areaSurfaceByKey,
  type AreaSurfaceKey,
} from "@/lib/quotes/area-surface-catalog";
import type { BaselinePaintSystemInput } from "@/lib/quotes/baseline-paint";
import {
  listKeysForSubstrate,
  type AreaSubstrateDefinition,
} from "@/lib/quotes/area-substrates";
import {
  getSubstrateProductivityOverride,
  substrateToLaborTab,
} from "@/lib/quotes/substrate-productivity";
import {
  resolveSurfaceLaborOverride,
  type SurfaceLaborOverride,
} from "@/lib/quotes/surface-labor-defaults";
import { resolveSurfaceLaborDefaultsFromCompany } from "@/lib/quotes/surface-productivity";
import { ProductionRateEditor } from "@/components/quotes/simple/ProductionRateEditor";
import { WorkItemScopeEditor } from "@/components/quotes/simple/WorkItemScopeEditor";
import { paintDefaultsRecord } from "@/lib/quotes/paint-defaults";
import {
  getSubstrateScopeEntries,
  resolveAreaCustomScopeLabels,
  type SubstrateScopeEntry,
} from "@/lib/quotes/scope-library";
import { Z_LAYERS } from "@/lib/ui/z-layers";
import { cn } from "@/lib/utils";
import type { Company, QuoteJobType } from "@/types/database";
import {
  SurfaceEditorRow,
  WALL_SURFACE_KEYS,
} from "@/components/quotes/simple/area-surface-rows";

type SubstrateDetailModalProps = {
  open: boolean;
  substrate: AreaSubstrateDefinition | null;
  room: RoomInput;
  company: Company;
  jobType: QuoteJobType;
  paintProducts: CompanyPaintProductRow[];
  paintDefaults: QuotePaintDefaultInput[];
  baselineSystems?: BaselinePaintSystemInput[];
  surfaceByKey: Map<AreaSurfaceKey, SurfaceInput>;
  onOpenChange: (open: boolean) => void;
  onUpdateSurface: (
    surfaceKey: string,
    patch: Partial<SurfaceInput>,
  ) => void;
  onResetSurfaceProduct: (surfaceKey: string) => void;
  onEditCloset?: () => void;
  onScopeChange: (
    entries: SubstrateScopeEntry[],
    options?: { registerAreaCustomLabel?: string },
  ) => void;
  onSubstrateProductivityChange?: (
    patch: Partial<SurfaceLaborOverride>,
  ) => void;
  onResetSubstrateProductivity?: () => void;
  onSubstrateCoatsChange?: (coats: number) => void;
};

export function SubstrateDetailModal({
  open,
  substrate,
  room,
  company,
  jobType,
  paintProducts,
  paintDefaults,
  baselineSystems,
  surfaceByKey,
  onOpenChange,
  onUpdateSurface,
  onResetSurfaceProduct,
  onEditCloset,
  onScopeChange,
  onSubstrateProductivityChange,
  onResetSubstrateProductivity,
  onSubstrateCoatsChange,
}: SubstrateDetailModalProps) {
  if (!substrate) return null;

  const substrateSurfaceKeys = listKeysForSubstrate(substrate);
  const substrateSurfaces = substrateSurfaceKeys
    .map((key) => surfaceByKey.get(key))
    .filter(Boolean) as SurfaceInput[];
  const substrateCoats =
    substrateSurfaces[0]?.coats ?? room.coats ?? 2;

  const laborTab = substrateToLaborTab(substrate.id);
  const laborDefaults = resolveSurfaceLaborDefaultsFromCompany(company);
  const referenceSurfaceType =
    substrate.id === "ceilings"
      ? "ceiling"
      : substrate.id === "trim"
        ? "trim"
        : substrate.id === "windows"
          ? "window"
          : substrate.id === "doors"
            ? "door"
            : "wall";
  const referenceRateType =
    substrate.id === "trim"
      ? "linear"
      : substrate.id === "windows" || substrate.id === "doors"
        ? "each"
        : "sqft";
  const systemOverride = resolveSurfaceLaborOverride(
    referenceSurfaceType,
    jobType,
    laborDefaults,
  );
  const storedSubstrateProductivity = getSubstrateProductivityOverride(
    room.prep_work,
    substrate.id,
  );
  const effectiveSubstrateProductivity = {
    ...systemOverride,
    ...storedSubstrateProductivity,
  };

  const defaultsRecord = paintDefaultsRecord(paintDefaults);
  const scopeEntries = getSubstrateScopeEntries(room.prep_work, substrate.id);
  const areaCustomScopeLabels = resolveAreaCustomScopeLabels(
    room.prep_work,
    jobType,
  );

  const renderEditorRows = () => {
    if (substrate.id === "walls") {
      return (
        <div className="space-y-3">
          {WALL_SURFACE_KEYS.map((key) => {
            const definition = areaSurfaceByKey(key);
            if (!definition) return null;
            return (
              <SurfaceEditorRow
                key={key}
                definition={definition}
                surface={surfaceByKey.get(key) ?? null}
                room={room}
                company={company}
                jobType={jobType}
                products={paintProducts}
                defaultProductId={
                  defaultsRecord.wall?.company_paint_product_id ?? null
                }
                onUpdate={(patch) => onUpdateSurface(key, patch)}
                onResetProduct={() => onResetSurfaceProduct(key)}
                baselineSystems={baselineSystems}
                paintDefaults={paintDefaults}
                substrateId={substrate.id}
                showProductionRate={false}
              />
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {substrate.toggleKeys.map((key) => {
          const definition =
            resolveAreaSurfaceDefinition(key, room.prep_work) ??
            areaSurfaceByKey(key);
          if (!definition) return null;
          return (
            <SurfaceEditorRow
              key={key}
              definition={definition}
              surface={surfaceByKey.get(key) ?? null}
              room={room}
              company={company}
              jobType={jobType}
              products={paintProducts}
              defaultProductId={
                defaultsRecord[definition.paint_default_type]
                  ?.company_paint_product_id ?? null
              }
              hideProduct={substrate.laborOnly}
              onUpdate={(patch) => onUpdateSurface(key, patch)}
              onResetProduct={() => onResetSurfaceProduct(key)}
              onEditCloset={key === "closet" ? onEditCloset : undefined}
              baselineSystems={baselineSystems}
              paintDefaults={paintDefaults}
              substrateId={substrate.id}
              showProductionRate={false}
            />
          );
        })}
        {substrate.companionKeys?.map((key) => {
          const definition = areaSurfaceByKey(key);
          if (!definition) return null;
          return (
            <SurfaceEditorRow
              key={key}
              definition={definition}
              surface={surfaceByKey.get(key) ?? null}
              room={room}
              company={company}
              jobType={jobType}
              products={paintProducts}
              defaultProductId={
                defaultsRecord[definition.paint_default_type]
                  ?.company_paint_product_id ?? null
              }
              locked
              companion
              onUpdate={(patch) => onUpdateSurface(key, patch)}
              onResetProduct={() => onResetSurfaceProduct(key)}
              baselineSystems={baselineSystems}
              paintDefaults={paintDefaults}
              substrateId={substrate.id}
              showProductionRate={false}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[min(92dvh,calc(100dvh-2rem))] w-[min(96vw,56rem)] max-w-[min(96vw,56rem)] flex-col gap-0 overflow-hidden p-0",
          Z_LAYERS.nestedDialogContent,
        )}
        overlayClassName={Z_LAYERS.nestedDialogOverlay}
        aria-describedby={undefined}
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="text-lg">{substrate.label}</DialogTitle>
              <DialogDescription>
                Set production rates, surfaces, prep hours, and scope of work.
              </DialogDescription>
            </div>
            {onSubstrateCoatsChange && !substrate.laborOnly ? (
              <div className="flex shrink-0 items-center gap-2">
                <Label
                  htmlFor="substrate-coats"
                  className="text-xs text-muted-foreground"
                >
                  Coats
                </Label>
                <Input
                  id="substrate-coats"
                  type="number"
                  min={1}
                  step={1}
                  className="h-8 w-16 px-2 text-center text-sm tabular-nums"
                  value={substrateCoats}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    onSubstrateCoatsChange(
                      Number.isFinite(next) && next >= 1 ? next : 1,
                    );
                  }}
                />
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="space-y-4">
            {laborTab && onSubstrateProductivityChange ? (
              <ProductionRateEditor
                surfaceType={referenceSurfaceType}
                rateType={referenceRateType}
                jobType={jobType}
                company={company}
                effective={effectiveSubstrateProductivity}
                stored={storedSubstrateProductivity}
                onChange={onSubstrateProductivityChange}
                onReset={
                  onResetSubstrateProductivity &&
                  storedSubstrateProductivity
                    ? onResetSubstrateProductivity
                    : undefined
                }
              />
            ) : null}
            <div className="space-y-3">{renderEditorRows()}</div>
            <WorkItemScopeEditor
              jobType={jobType}
              entries={scopeEntries}
              areaCustomScopeLabels={areaCustomScopeLabels}
              onChange={onScopeChange}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
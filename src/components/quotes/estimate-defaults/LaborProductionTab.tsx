"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EstimateDefaultsCurrencyInput } from "@/components/quotes/estimate-defaults/EstimateDefaultsCurrencyInput";
import { EstimateDefaultsNumberInput } from "@/components/quotes/estimate-defaults/EstimateDefaultsNumberInput";
import type { CompanyEstimateDefaults } from "@/lib/quotes/company-estimate-defaults";
import {
  type LaborProductionSubTab,
  type LaborProductionSurfaceSubTab,
} from "@/lib/quotes/estimate-defaults-wizard-steps";
import {
  CABINET_LABOR_SYSTEM_META,
  DEFAULT_CABINET_LABOR_DEFAULTS,
  getSurfaceLaborSystemDefaultMeta,
  hasCabinetLaborOverride,
  hasSurfaceLaborOverride,
  resetSurfaceLaborOverride,
  SURFACE_LABOR_TAB_META,
  type CabinetLaborDefaults,
  type CompanySurfaceLaborDefaults,
  type SurfaceLaborOverride,
  type SurfaceLaborTabKey,
} from "@/lib/quotes/surface-labor-defaults";
import type { SystemSurfaceLaborValues } from "@/lib/quotes/surface-labor-system-defaults";

export type {
  LaborProductionSubTab,
  LaborProductionSurfaceSubTab,
} from "@/lib/quotes/estimate-defaults-wizard-steps";
type LaborProductionTabProps = {
  state: CompanyEstimateDefaults;
  onChange: (patch: Partial<CompanyEstimateDefaults>) => void;
  surfaceSubTab: LaborProductionSurfaceSubTab;
};

type LaborProductionSubTabNavProps = {
  value: LaborProductionSubTab | null;
  onValueChange: (value: LaborProductionSubTab) => void;
};

const LABOR_SUB_TAB_PILL_CLASS =
  "h-8 rounded-md border border-border/60 px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm";

export function LaborProductionSubTabNav({
  value,
  onValueChange,
}: LaborProductionSubTabNavProps) {
  return (
    <Tabs
      value={value ?? ""}
      onValueChange={(next) => onValueChange(next as LaborProductionSubTab)}
    >
      <TabsList className="flex h-auto min-h-8 flex-wrap justify-center gap-1 bg-transparent p-0">
        {(["interior", "exterior"] as const).map((scope) =>
          SURFACE_LABOR_TAB_META.map((tab) => (
            <TabsTrigger
              key={`${scope}-${tab.key}`}
              value={`${scope}-${tab.key}`}
              className={LABOR_SUB_TAB_PILL_CLASS}
            >
              {scope === "interior" ? "Int." : "Ext."} {tab.label}
            </TabsTrigger>
          )),
        )}
        <TabsTrigger value="cabinets" className={LABOR_SUB_TAB_PILL_CLASS}>
          Cabinets
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function resolveDisplayNumber(
  value: number | null | undefined,
  fallback: number | undefined,
): number | null {
  if (value != null) return value;
  if (fallback != null) return fallback;
  return null;
}

function formatCoatPhrase(coats: number): string {
  return coats === 1 ? "1 coat" : `${coats} coats`;
}

function formatRateNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatHourPhrase(hours: number): string {
  if (hours === 1) return "1 hour";
  return `${formatRateNumber(hours)} hours`;
}

function buildProductionRateSummary({
  tabKey,
  surfaceLabel,
  stored,
  systemValues,
}: {
  tabKey: SurfaceLaborTabKey;
  surfaceLabel: string;
  stored?: SurfaceLaborOverride | null;
  systemValues: SystemSurfaceLaborValues;
}): string | null {
  const coatBasis = resolveDisplayNumber(
    stored?.coatBasis,
    systemValues.coatBasis ?? 2,
  );
  if (!coatBasis || coatBasis <= 0) return null;

  const coatPhrase = formatCoatPhrase(coatBasis);

  const surface = surfaceLabel.toLowerCase();

  if (tabKey === "walls" || tabKey === "ceilings") {
    const rate = resolveDisplayNumber(
      stored?.sqFtPerLaborHour,
      systemValues.sqFtPerLaborHour,
    );
    if (!rate || rate <= 0) return null;
    return `Averaged across the whole job: about ${formatRateNumber(rate)} square feet of ${surface} with ${coatPhrase}, per hour of crew time.`;
  }

  if (tabKey === "trim") {
    const rate = resolveDisplayNumber(
      stored?.linearFtPerLaborHour,
      systemValues.linearFtPerLaborHour,
    );
    if (!rate || rate <= 0) return null;
    return `Averaged across the whole job: about ${formatRateNumber(rate)} linear feet of ${surface} with ${coatPhrase}, per hour of crew time.`;
  }

  if (tabKey === "doors" || tabKey === "windows") {
    const hours = resolveDisplayNumber(
      stored?.hoursPerUnit,
      systemValues.hoursPerUnit,
    );
    if (!hours || hours <= 0) return null;
    const unit = tabKey === "doors" ? "door" : "window";
    return `Averaged across the whole job: about ${formatHourPhrase(hours)} per ${unit} with ${coatPhrase}.`;
  }

  return null;
}

function ProductionRateExplanation({
  tabKey,
  surfaceLabel,
  stored,
  systemValues,
}: {
  tabKey: SurfaceLaborTabKey;
  surfaceLabel: string;
  stored?: SurfaceLaborOverride | null;
  systemValues: SystemSurfaceLaborValues;
}) {
  const summary = buildProductionRateSummary({
    tabKey,
    surfaceLabel,
    stored,
    systemValues,
  });
  if (!summary) return null;

  return (
    <p className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      {summary}
    </p>
  );
}

function updateSurfaceOverride(
  defaults: CompanySurfaceLaborDefaults,
  scope: "interior" | "exterior",
  key: SurfaceLaborTabKey,
  patch: Partial<SurfaceLaborOverride>,
): CompanySurfaceLaborDefaults {
  return {
    ...defaults,
    [scope]: {
      ...defaults[scope],
      [key]: {
        ...defaults[scope][key],
        ...patch,
      },
    },
  };
}

function SurfaceFields({
  scope,
  tabKey,
  state,
  onChange,
  systemMeta,
}: {
  scope: "interior" | "exterior";
  tabKey: SurfaceLaborTabKey;
  state: CompanyEstimateDefaults;
  onChange: (patch: Partial<CompanyEstimateDefaults>) => void;
  systemMeta: ReturnType<typeof getSurfaceLaborSystemDefaultMeta>;
}) {
  const stored = state.surfaceLaborDefaults[scope][tabKey];
  const patch = (next: Partial<SurfaceLaborOverride>) =>
    onChange({
      surfaceLaborDefaults: updateSurfaceOverride(
        state.surfaceLaborDefaults,
        scope,
        tabKey,
        next,
      ),
    });

  if (tabKey === "walls" || tabKey === "ceilings") {
    return (
      <div className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Production (sq ft / hr)</Label>
            <EstimateDefaultsNumberInput
              min={1}
              fallback={null}
              placeholder={String(systemMeta.values.sqFtPerLaborHour ?? "")}
              value={stored?.sqFtPerLaborHour ?? null}
              onChange={(sqFtPerLaborHour) => patch({ sqFtPerLaborHour })}
            />
          </div>
          <div className="space-y-2">
            <Label>Coat basis</Label>
            <EstimateDefaultsNumberInput
              min={1}
              fallback={null}
              placeholder={String(systemMeta.values.coatBasis ?? 2)}
              value={stored?.coatBasis ?? null}
              onChange={(coatBasis) => patch({ coatBasis })}
            />
          </div>
        </div>
        <ProductionRateExplanation
          tabKey={tabKey}
          surfaceLabel={systemMeta.label}
          stored={stored}
          systemValues={systemMeta.values}
        />
      </div>
    );
  }

  if (tabKey === "trim") {
    return (
      <div className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Production (ln ft / hr)</Label>
            <EstimateDefaultsNumberInput
              min={1}
              fallback={null}
              placeholder={String(systemMeta.values.linearFtPerLaborHour ?? "")}
              value={stored?.linearFtPerLaborHour ?? null}
              onChange={(linearFtPerLaborHour) =>
                patch({ linearFtPerLaborHour })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Profile width (inches)</Label>
            <EstimateDefaultsNumberInput
              min={0.5}
              step={0.5}
              fallback={null}
              placeholder={String(systemMeta.values.profileWidthInches ?? 4)}
              value={stored?.profileWidthInches ?? null}
              onChange={(profileWidthInches) => patch({ profileWidthInches })}
            />
            <p className="text-xs text-muted-foreground">
              Baseboard face height — converts linear ft to paintable sq ft for
              gallons.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Coat basis</Label>
            <EstimateDefaultsNumberInput
              min={1}
              fallback={null}
              placeholder={String(systemMeta.values.coatBasis ?? 1)}
              value={stored?.coatBasis ?? null}
              onChange={(coatBasis) => patch({ coatBasis })}
            />
          </div>
        </div>
        <ProductionRateExplanation
          tabKey={tabKey}
          surfaceLabel={systemMeta.label}
          stored={stored}
          systemValues={systemMeta.values}
        />
      </div>
    );
  }

  const unitLabel = tabKey === "doors" ? "door" : "window";

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Hours per {unitLabel}</Label>
          <EstimateDefaultsNumberInput
            min={0.1}
            step={0.1}
            fallback={null}
            placeholder={String(systemMeta.values.hoursPerUnit ?? "")}
            value={stored?.hoursPerUnit ?? null}
            onChange={(hoursPerUnit) => patch({ hoursPerUnit })}
          />
        </div>
        <div className="space-y-2">
          <Label>Unit width (inches)</Label>
          <EstimateDefaultsNumberInput
            min={1}
            fallback={null}
            placeholder={String(systemMeta.values.unitWidthInches ?? 36)}
            value={stored?.unitWidthInches ?? null}
            onChange={(unitWidthInches) => patch({ unitWidthInches })}
          />
        </div>
        <div className="space-y-2">
          <Label>Unit height (inches)</Label>
          <EstimateDefaultsNumberInput
            min={1}
            fallback={null}
            placeholder={String(systemMeta.values.unitHeightInches ?? "")}
            value={stored?.unitHeightInches ?? null}
            onChange={(unitHeightInches) => patch({ unitHeightInches })}
          />
        </div>
        <div className="space-y-2">
          <Label>Painted sides</Label>
          <EstimateDefaultsNumberInput
            min={1}
            max={2}
            fallback={null}
            placeholder={String(systemMeta.values.paintedSides ?? "")}
            value={stored?.paintedSides ?? null}
            onChange={(paintedSides) => patch({ paintedSides })}
          />
        </div>
        <div className="space-y-2">
          <Label>Coat basis</Label>
          <EstimateDefaultsNumberInput
            min={1}
            fallback={null}
            placeholder={String(systemMeta.values.coatBasis ?? 1)}
            value={stored?.coatBasis ?? null}
            onChange={(coatBasis) => patch({ coatBasis })}
          />
        </div>
      </div>
      <ProductionRateExplanation
        tabKey={tabKey}
        surfaceLabel={systemMeta.label}
        stored={stored}
        systemValues={systemMeta.values}
      />
    </div>
  );
}

const CABINET_UNIT_ROWS = [
  {
    key: "Box",
    unitLabel: "box",
    hours: "hoursPerBox",
    defaultHours: DEFAULT_CABINET_LABOR_DEFAULTS.hoursPerBox,
  },
  {
    key: "Door",
    unitLabel: "door",
    hours: "hoursPerDoor",
    defaultHours: DEFAULT_CABINET_LABOR_DEFAULTS.hoursPerDoor,
  },
  {
    key: "Drawer front",
    unitLabel: "drawer front",
    hours: "hoursPerDrawer",
    defaultHours: DEFAULT_CABINET_LABOR_DEFAULTS.hoursPerDrawer,
  },
] as const;

function CabinetFields({
  cabinets,
  onChange,
}: {
  cabinets: CabinetLaborDefaults;
  onChange: (cabinets: CabinetLaborDefaults) => void;
}) {
  const patch = (next: Partial<CabinetLaborDefaults>) =>
    onChange({ ...cabinets, ...next });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Set average crew hours per cabinet unit. Estimates multiply these hours
        by your average labor cost per hour.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {CABINET_UNIT_ROWS.map((row) => {
          const effectiveHours =
            cabinets[row.hours] ?? row.defaultHours;
          return (
            <div
              key={row.key}
              className="space-y-3 rounded-lg border border-border/70 bg-card/30 p-3"
            >
              <p className="text-sm font-medium">{row.key}</p>
              <div className="space-y-2">
                <Label className="text-xs">Hours per {row.unitLabel}</Label>
                <EstimateDefaultsNumberInput
                  min={0.1}
                  step={0.05}
                  fallback={null}
                  placeholder={String(row.defaultHours)}
                  value={cabinets[row.hours] ?? null}
                  onChange={(value) => patch({ [row.hours]: value })}
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Averaged across the whole job: about {formatHourPhrase(effectiveHours)}{" "}
                per {row.unitLabel}.
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LaborProductionSurfacePanel({
  surfaceSubTab,
  state,
  onChange,
  highlighted = false,
}: {
  surfaceSubTab: LaborProductionSurfaceSubTab;
  state: CompanyEstimateDefaults;
  onChange: (patch: Partial<CompanyEstimateDefaults>) => void;
  highlighted?: boolean;
}) {
  if (surfaceSubTab === "cabinets") {
    const cabinets = state.surfaceLaborDefaults.cabinets;
    const isCustomized = hasCabinetLaborOverride(cabinets);

    return (
      <div
        className={cn(
          "rounded-lg border border-border/60 bg-background/40 p-4 transition-colors",
          highlighted && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
        )}
      >
        <div className="mb-4 flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              Recommended: {CABINET_LABOR_SYSTEM_META.recommendedDefault}
            </p>
            <p className="text-xs text-muted-foreground">
              Typical range: {CABINET_LABOR_SYSTEM_META.typicalRange}
            </p>
            <p className="text-xs text-muted-foreground">
              {CABINET_LABOR_SYSTEM_META.notes}
            </p>
          </div>
          <Button
            type="button"
            variant={isCustomized ? "outline" : "secondary"}
            size="sm"
            className="shrink-0"
            disabled={!isCustomized}
            onClick={() =>
              onChange({
                surfaceLaborDefaults: {
                  ...state.surfaceLaborDefaults,
                  cabinets: {},
                },
              })
            }
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to default
          </Button>
        </div>
        <CabinetFields
          cabinets={cabinets}
          onChange={(nextCabinets) =>
            onChange({
              surfaceLaborDefaults: {
                ...state.surfaceLaborDefaults,
                cabinets: nextCabinets,
              },
            })
          }
        />
      </div>
    );
  }

  const [scope, tabKey] = surfaceSubTab.split("-") as [
    "interior" | "exterior",
    SurfaceLaborTabKey,
  ];
  const systemMeta = getSurfaceLaborSystemDefaultMeta(scope, tabKey);
  const stored = state.surfaceLaborDefaults[scope][tabKey];
  const isCustomized = hasSurfaceLaborOverride(stored);

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-background/40 p-4 transition-colors",
        highlighted && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      <div className="mb-4 flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            Recommended: {systemMeta.recommendedDefault}
          </p>
          <p className="text-xs text-muted-foreground">
            Typical range: {systemMeta.typicalRange}
          </p>
          <p className="text-xs text-muted-foreground">{systemMeta.notes}</p>
        </div>
        <Button
          type="button"
          variant={isCustomized ? "outline" : "secondary"}
          size="sm"
          className="shrink-0"
          disabled={!isCustomized}
          onClick={() =>
            onChange({
              surfaceLaborDefaults: resetSurfaceLaborOverride(
                state.surfaceLaborDefaults,
                scope,
                tabKey,
              ),
            })
          }
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to default
        </Button>
      </div>
      <SurfaceFields
        scope={scope}
        tabKey={tabKey}
        state={state}
        onChange={onChange}
        systemMeta={systemMeta}
      />
    </div>
  );
}

export function LaborCostSection({
  state,
  onChange,
}: Pick<LaborProductionTabProps, "state" | "onChange">) {
  return (
    <section className="max-w-xl space-y-2 rounded-lg border border-border/70 bg-muted/15 p-4">
      <Label>Average labor cost (per hour)</Label>
      <EstimateDefaultsCurrencyInput
        fallback={null}
        placeholder="0.00"
        value={state.avgLaborCostPerHour}
        onChange={(avgLaborCostPerHour) => onChange({ avgLaborCostPerHour })}
      />
      <p className="text-xs text-muted-foreground">
        Blended hourly crew cost — average wages plus insurance, benefits, and
        other employer costs per hour worked. Surface hours × this rate = direct
        labor on estimates.
      </p>
    </section>
  );
}

export function LaborProductionTab({
  state,
  onChange,
  surfaceSubTab,
  highlightActive = false,
}: LaborProductionTabProps & { highlightActive?: boolean }) {
  return (
    <LaborProductionSurfacePanel
      surfaceSubTab={surfaceSubTab}
      state={state}
      onChange={onChange}
      highlighted={highlightActive}
    />
  );
}
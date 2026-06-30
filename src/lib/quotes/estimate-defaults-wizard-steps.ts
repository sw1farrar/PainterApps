import type { BaselineApplicationScope } from "@/lib/quotes/baseline-paint";
import { getSurfaceLaborSystemDefaultMeta } from "@/lib/quotes/surface-labor-system-defaults";
import {
  SURFACE_LABOR_TAB_META,
  type SurfaceLaborTabKey,
} from "@/lib/quotes/surface-labor-defaults";

export type EstimateDefaultsMainTab = "margin" | "production" | "products";

export type LaborProductionSurfaceSubTab =
  | `${"interior" | "exterior"}-${SurfaceLaborTabKey}`
  | "cabinets";

export type LaborProductionSubTab = LaborProductionSurfaceSubTab;

export const DEFAULT_LABOR_SUB_TAB: LaborProductionSurfaceSubTab = "interior-walls";

export const LABOR_PRODUCTION_SUB_TAB_ORDER: LaborProductionSurfaceSubTab[] = [
  ...(["interior", "exterior"] as const).flatMap((scope) =>
    SURFACE_LABOR_TAB_META.map(
      (tab) => `${scope}-${tab.key}` as LaborProductionSurfaceSubTab,
    ),
  ),
  "cabinets",
];

export type EstimateDefaultsWizardStepId =
  | "pricing"
  | `labor-${LaborProductionSurfaceSubTab}`
  | "products-interior"
  | "products-exterior";

export type EstimateDefaultsWizardStep = {
  id: EstimateDefaultsWizardStepId;
  label: string;
  short: string;
};

function laborSubTabLabel(subTab: LaborProductionSurfaceSubTab): string {
  if (subTab === "cabinets") return "Cabinet labor";
  const [scope, tabKey] = subTab.split("-") as [
    "interior" | "exterior",
    SurfaceLaborTabKey,
  ];
  const meta = getSurfaceLaborSystemDefaultMeta(scope, tabKey);
  return meta.label;
}

function laborSubTabShort(subTab: LaborProductionSurfaceSubTab): string {
  if (subTab === "cabinets") return "Cabinets";
  const [scope, tabKey] = subTab.split("-") as [
    "interior" | "exterior",
    SurfaceLaborTabKey,
  ];
  const scopeLabel = scope === "interior" ? "Int." : "Ext.";
  const tabLabel =
    tabKey === "walls"
      ? "Walls"
      : tabKey === "ceilings"
        ? "Ceilings"
        : tabKey === "trim"
          ? "Trim"
          : tabKey === "windows"
            ? "Windows"
            : "Doors";
  return `${scopeLabel} ${tabLabel}`;
}

export const ESTIMATE_DEFAULTS_WIZARD_STEPS: EstimateDefaultsWizardStep[] = [
  { id: "pricing", label: "Labor and margin", short: "Labor & margin" },
  ...LABOR_PRODUCTION_SUB_TAB_ORDER.map((subTab) => ({
    id: `labor-${subTab}` as EstimateDefaultsWizardStepId,
    label: laborSubTabLabel(subTab),
    short: laborSubTabShort(subTab),
  })),
  { id: "products-interior", label: "Interior products", short: "Int. products" },
  { id: "products-exterior", label: "Exterior products", short: "Ext. products" },
];

export function wizardStepIndex(stepId: EstimateDefaultsWizardStepId): number {
  return ESTIMATE_DEFAULTS_WIZARD_STEPS.findIndex((step) => step.id === stepId);
}

export function clampWizardStepIndex(index: number): number {
  return Math.max(
    0,
    Math.min(index, ESTIMATE_DEFAULTS_WIZARD_STEPS.length - 1),
  );
}

export function mainTabFromStepId(
  stepId: EstimateDefaultsWizardStepId,
): EstimateDefaultsMainTab {
  if (stepId === "pricing") return "margin";
  if (stepId === "products-interior" || stepId === "products-exterior") {
    return "products";
  }
  return "production";
}

export function mainTabFromStepIndex(index: number): EstimateDefaultsMainTab {
  const step = ESTIMATE_DEFAULTS_WIZARD_STEPS[clampWizardStepIndex(index)];
  return step ? mainTabFromStepId(step.id) : "margin";
}

export function firstWizardStepIndexForMainTab(
  tab: EstimateDefaultsMainTab,
): number {
  switch (tab) {
    case "margin":
      return wizardStepIndex("pricing");
    case "production":
      return wizardStepIndex(`labor-${DEFAULT_LABOR_SUB_TAB}`);
    case "products":
      return wizardStepIndex("products-interior");
  }
}

export function laborSubTabFromStepId(
  stepId: EstimateDefaultsWizardStepId,
): LaborProductionSubTab | null {
  if (!stepId.startsWith("labor-")) return null;
  return stepId.replace("labor-", "") as LaborProductionSurfaceSubTab;
}

export function productsScopeFromStepId(
  stepId: EstimateDefaultsWizardStepId,
): BaselineApplicationScope | null {
  if (stepId === "products-interior") return "interior";
  if (stepId === "products-exterior") return "exterior";
  return null;
}

export function wizardStepIdForLaborSubTab(
  subTab: LaborProductionSubTab,
): EstimateDefaultsWizardStepId {
  return `labor-${subTab}`;
}

export function wizardStepIdForProductsScope(
  scope: BaselineApplicationScope,
): EstimateDefaultsWizardStepId {
  return scope === "interior" ? "products-interior" : "products-exterior";
}
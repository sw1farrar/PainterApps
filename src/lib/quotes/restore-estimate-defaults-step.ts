import { QUOTE_PAINT_TIERS } from "@/lib/paint-library/types";
import {
  emptyBaselinePaintSystems,
  type BaselineApplicationScope,
} from "@/lib/quotes/baseline-paint";
import type { CompanyEstimateDefaults } from "@/lib/quotes/company-estimate-defaults";
import { emptyTierDefaultsByScope } from "@/lib/quotes/company-estimate-defaults";
import { ONBOARDING_DEFAULTS } from "@/lib/onboarding/defaults";
import type { EstimateDefaultsWizardStepId } from "@/lib/quotes/estimate-defaults-wizard-steps";
import type { LaborProductionSurfaceSubTab } from "@/lib/quotes/estimate-defaults-wizard-steps";
import {
  hasCabinetLaborOverride,
  hasSurfaceLaborOverride,
  resetSurfaceLaborOverride,
  type SurfaceLaborTabKey,
} from "@/lib/quotes/surface-labor-defaults";

function emptyBaselineForScope(scope: BaselineApplicationScope) {
  return emptyBaselinePaintSystems(scope === "interior" ? "interior" : "exterior");
}

function isBaselineScopeCustomized(
  state: CompanyEstimateDefaults,
  scope: BaselineApplicationScope,
): boolean {
  return state.baselineSystems
    .filter((row) => row.application_scope === scope)
    .some(
      (row) =>
        row.primer_product_id != null ||
        row.topcoat_product_id != null ||
        row.primer_coats !== 1 ||
        row.topcoat_coats !== 2,
    );
}

function isTierScopeCustomized(
  state: CompanyEstimateDefaults,
  scope: BaselineApplicationScope,
): boolean {
  const record = state.tierDefaultsByScope[scope];
  return QUOTE_PAINT_TIERS.some((tier) => {
    const config = record[tier];
    return (
      config.primer_product_id != null ||
      config.topcoat_product_id != null ||
      config.primer_coats !== 1 ||
      config.topcoat_coats !== 2 ||
      config.labor_hours_delta_pct !== 0 ||
      config.labor_hours_delta_hours !== 0 ||
      config.prep_hours_delta !== 0 ||
      (config.value_add_features?.length ?? 0) > 0
    );
  });
}

function restoreBaselineScope(
  state: CompanyEstimateDefaults,
  scope: BaselineApplicationScope,
): CompanyEstimateDefaults {
  const other = state.baselineSystems.filter(
    (row) => row.application_scope !== scope,
  );
  return {
    ...state,
    baselineSystems: [...other, ...emptyBaselineForScope(scope)],
  };
}

function restoreTierScope(
  state: CompanyEstimateDefaults,
  scope: BaselineApplicationScope,
): CompanyEstimateDefaults {
  return {
    ...state,
    tierDefaultsByScope: {
      ...state.tierDefaultsByScope,
      [scope]: emptyTierDefaultsByScope()[scope],
    },
  };
}

export function isEstimateDefaultsStepCustomized(
  stepId: EstimateDefaultsWizardStepId,
  state: CompanyEstimateDefaults,
): boolean {
  if (stepId === "pricing") {
    return (
      state.avgLaborCostPerHour != null ||
      state.overheadPct !== 0 ||
      state.defaultGrossMarginPct !== 0 ||
      state.taxRate !== 0
    );
  }

  if (stepId.startsWith("labor-")) {
    const subTab = stepId.replace("labor-", "") as LaborProductionSurfaceSubTab;
    if (subTab === "cabinets") {
      return hasCabinetLaborOverride(state.surfaceLaborDefaults.cabinets);
    }
    const [scope, tabKey] = subTab.split("-") as [
      "interior" | "exterior",
      SurfaceLaborTabKey,
    ];
    return hasSurfaceLaborOverride(
      state.surfaceLaborDefaults[scope]?.[tabKey],
    );
  }

  if (stepId === "products-interior") {
    return (
      state.spotPrimeMaterialPct !== ONBOARDING_DEFAULTS.spotPrimeMaterialPct ||
      isBaselineScopeCustomized(state, "interior") ||
      isTierScopeCustomized(state, "interior")
    );
  }

  if (stepId === "products-exterior") {
    return (
      isBaselineScopeCustomized(state, "exterior") ||
      isTierScopeCustomized(state, "exterior")
    );
  }

  return false;
}

export function restoreEstimateDefaultsStep(
  stepId: EstimateDefaultsWizardStepId,
  state: CompanyEstimateDefaults,
): CompanyEstimateDefaults {
  if (stepId === "pricing") {
    return {
      ...state,
      avgLaborCostPerHour: null,
      overheadPct: 0,
      defaultGrossMarginPct: 0,
      taxRate: 0,
    };
  }

  if (stepId.startsWith("labor-")) {
    const subTab = stepId.replace("labor-", "") as LaborProductionSurfaceSubTab;
    if (subTab === "cabinets") {
      return {
        ...state,
        surfaceLaborDefaults: {
          ...state.surfaceLaborDefaults,
          cabinets: {},
        },
      };
    }
    const [scope, tabKey] = subTab.split("-") as [
      "interior" | "exterior",
      SurfaceLaborTabKey,
    ];
    return {
      ...state,
      surfaceLaborDefaults: resetSurfaceLaborOverride(
        state.surfaceLaborDefaults,
        scope,
        tabKey,
      ),
    };
  }

  if (stepId === "products-interior") {
    let next = {
      ...state,
      spotPrimeMaterialPct: ONBOARDING_DEFAULTS.spotPrimeMaterialPct,
    };
    next = restoreBaselineScope(next, "interior");
    next = restoreTierScope(next, "interior");
    return next;
  }

  if (stepId === "products-exterior") {
    let next = { ...state };
    next = restoreBaselineScope(next, "exterior");
    next = restoreTierScope(next, "exterior");
    return next;
  }

  return state;
}
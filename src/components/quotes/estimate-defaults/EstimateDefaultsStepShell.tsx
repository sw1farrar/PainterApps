"use client";

import type { ReactNode } from "react";
import { EstimateDefaultsRestoreButton } from "@/components/quotes/estimate-defaults/EstimateDefaultsRestoreButton";
import type { CompanyEstimateDefaults } from "@/lib/quotes/company-estimate-defaults";
import type { EstimateDefaultsWizardStepId } from "@/lib/quotes/estimate-defaults-wizard-steps";
import {
  isEstimateDefaultsStepCustomized,
  restoreEstimateDefaultsStep,
} from "@/lib/quotes/restore-estimate-defaults-step";

type EstimateDefaultsStepShellProps = {
  stepId: EstimateDefaultsWizardStepId;
  state: CompanyEstimateDefaults;
  onChange: (patch: Partial<CompanyEstimateDefaults>) => void;
  children: ReactNode;
};

export function EstimateDefaultsStepShell({
  stepId,
  state,
  onChange,
  children,
}: EstimateDefaultsStepShellProps) {
  const canRestore = isEstimateDefaultsStepCustomized(stepId, state);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <EstimateDefaultsRestoreButton
          disabled={!canRestore}
          onClick={() => onChange(restoreEstimateDefaultsStep(stepId, state))}
        />
      </div>
      {children}
    </div>
  );
}
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateCompanyFeatures } from "@/app/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  ALL_COMPANY_FEATURES,
  COMPANY_FEATURE_META,
} from "@/lib/auth/company-features";
import type { CompanyFeature } from "@/types/database";

type CompanyFeatureTogglesProps = {
  companyId: string;
  enabledFeatures: CompanyFeature[];
};

export function CompanyFeatureToggles({
  companyId,
  enabledFeatures,
}: CompanyFeatureTogglesProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<CompanyFeature[]>(
    enabledFeatures,
  );
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setSelected(enabledFeatures);
  }, [enabledFeatures]);

  const hasChanges =
    selected.length !== enabledFeatures.length ||
    ALL_COMPANY_FEATURES.some(
      (feature) =>
        selected.includes(feature) !== enabledFeatures.includes(feature),
    );

  function toggleFeature(feature: CompanyFeature) {
    if (feature === "free_tools_sell_sheets") return;

    setSelected((current) =>
      current.includes(feature)
        ? current.filter((item) => item !== feature)
        : [...current, feature],
    );
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateCompanyFeatures(companyId, selected);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to update features.");
      return;
    }

    toast.success("Company features updated.");
    router.refresh();
  }

  return (
    <Card className="border-border bg-card/60">
      <CardHeader>
        <CardTitle className="text-white">Enabled features</CardTitle>
        <CardDescription>
          Control which portal areas this company can access. Sell sheets is
          always required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {ALL_COMPANY_FEATURES.map((feature) => {
            const meta = COMPANY_FEATURE_META[feature];
            const checked = selected.includes(feature);
            const locked = feature === "free_tools_sell_sheets";

            return (
              <label
                key={feature}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background/20 px-4 py-3 transition hover:border-primary/30 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={checked}
                  disabled={locked || saving}
                  onChange={() => toggleFeature(feature)}
                />
                <span className="min-w-0 flex-1">
                  <Label className="text-sm font-medium text-white">
                    {meta.label}
                    {locked ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (required)
                      </span>
                    ) : null}
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                </span>
              </label>
            );
          })}
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? "Saving…" : "Save features"}
        </Button>
      </CardContent>
    </Card>
  );
}
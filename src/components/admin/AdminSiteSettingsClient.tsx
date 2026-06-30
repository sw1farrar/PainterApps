"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  updateSiteXaiModelTier,
  type SiteSettingsView,
} from "@/app/app/admin/settings/actions";
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
  XAI_MODEL_TIER_META,
  XAI_MODEL_TIERS,
  type XaiModelTier,
} from "@/lib/xai/models";

type AdminSiteSettingsClientProps = {
  initialSettings: SiteSettingsView;
};

function formatUpdatedAt(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdminSiteSettingsClient({
  initialSettings,
}: AdminSiteSettingsClientProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = React.useState<XaiModelTier>(
    initialSettings.xaiModelTier,
  );
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setSelectedTier(initialSettings.xaiModelTier);
  }, [initialSettings.xaiModelTier]);

  const hasChanges = selectedTier !== initialSettings.xaiModelTier;
  const activeMeta = XAI_MODEL_TIER_META[initialSettings.xaiModelTier];
  const updatedLabel = formatUpdatedAt(initialSettings.updatedAt);

  async function handleSave() {
    setSaving(true);
    const result = await updateSiteXaiModelTier(selectedTier);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error ?? "Could not save site settings.");
      return;
    }

    toast.success(
      `Site AI model switched to ${XAI_MODEL_TIER_META[selectedTier].label}.`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-white">Site settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Global configuration for PainterApps site administration.
        </p>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-white">AI model</CardTitle>
          <CardDescription>
            Applies to AI workflows on sell sheets and free tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialSettings.schemaWarning ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {initialSettings.schemaWarning}
            </div>
          ) : null}

          <div className="rounded-lg border border-border/80 bg-background/20 px-4 py-3 text-sm">
            <p className="text-white">
              Active tier:{" "}
              <span className="font-medium">{activeMeta.label}</span>
            </p>
            {updatedLabel ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Last updated {updatedLabel}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            {XAI_MODEL_TIERS.map((tier) => {
              const meta = XAI_MODEL_TIER_META[tier];
              const checked = selectedTier === tier;

              return (
                <label
                  key={tier}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background/20 px-4 py-3 transition hover:border-primary/30 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70"
                >
                  <input
                    type="radio"
                    name="xai-model-tier"
                    className="mt-1 h-4 w-4 border-input"
                    checked={checked}
                    disabled={saving}
                    onChange={() => setSelectedTier(tier)}
                  />
                  <span className="min-w-0 flex-1">
                    <Label className="text-sm font-medium text-white">
                      {meta.label}
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {meta.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {meta.inputPricePerMillion} input /{" "}
                      {meta.outputPricePerMillion} output per 1M tokens
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
            {saving ? "Saving..." : "Save model preference"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
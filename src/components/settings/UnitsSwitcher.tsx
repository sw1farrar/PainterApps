"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setUnitsAction } from "@/app/app/settings/actions";
import type { UnitSystem } from "@/lib/units";
import { cn } from "@/lib/utils";

export function UnitsSwitcher({ units }: { units: UnitSystem }) {
  const t = useTranslations("app");
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(next: UnitSystem) {
    if (next === units) return;
    start(async () => {
      await setUnitsAction(next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label={t("units")}
        className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs font-medium"
      >
        {(["imperial", "metric"] as const).map((code) => (
          <button
            key={code}
            type="button"
            disabled={pending}
            onClick={() => choose(code)}
            className={cn(
              "rounded-full px-3 py-1 transition",
              units === code
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {code === "imperial" ? t("unitsUs") : t("unitsMetric")}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {units === "metric" ? t("metric") : t("imperial")}
      </p>
    </div>
  );
}

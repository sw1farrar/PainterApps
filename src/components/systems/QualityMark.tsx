"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  applicationClass,
  resinName,
  storedScore,
  volumeSolidsPct,
} from "@/lib/systems/quality";
import type { TdsProduct } from "@/lib/systems/types";
import { cn } from "@/lib/utils";

function formatScore(score: number, locale: string) {
  return score.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function shortFeature(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 42) return clean;
  const cut = clean.slice(0, 39);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 18 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function Steps({ score, size }: { score: number; size: "sm" | "md" }) {
  const filled = Math.round(score);
  return (
    <span className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "rounded-[1px]",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2 rounded-[2px]",
            i < filled ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

export function QualityFacts({ product }: { product: TdsProduct }) {
  const t = useTranslations("systems");
  const locale = useLocale();
  const chips: Array<{ key: string; label: string; tone: "lead" | "note" }> = [];
  const solids = volumeSolidsPct(product);
  if (solids != null) {
    chips.push({
      key: "solids",
      tone: "lead",
      label: t("qualitySolids", {
        n: solids.toLocaleString(locale, { maximumFractionDigits: 1 }),
      }),
    });
  }
  const resin = resinName(product);
  if (resin) chips.push({ key: "resin", tone: "lead", label: resin });
  for (const feature of (product.features ?? []).slice(0, 3)) {
    const label = shortFeature(feature);
    if (!label) continue;
    chips.push({ key: label, tone: "note", label });
  }
  if (!chips.length) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] leading-4",
            chip.tone === "lead"
              ? "bg-primary/10 font-medium text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {chip.label}
        </span>
      ))}
    </span>
  );
}

export function QualityMark({
  product,
  variant = "row",
}: {
  product: TdsProduct;
  variant?: "row" | "detail";
}) {
  const t = useTranslations("systems");
  const locale = useLocale();
  const score = storedScore(product);
  if (score == null) return null;
  const label = formatScore(score, locale);
  const summary = product.qualitySummary?.trim();

  if (variant === "row") {
    return (
      <span
        className="flex shrink-0 flex-col items-end gap-1"
        aria-label={t("qualityAria", { score: label })}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("quality")}
        </span>
        <span className="text-sm font-semibold tabular-nums leading-none">{label}</span>
        <Steps score={score} size="sm" />
      </span>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {t("qualityIndex")}
        {" · "}
        {t(`qualityClasses.${applicationClass(product)}`)}
      </p>
      <p className="mt-1 flex items-center gap-3">
        <span className="text-2xl font-semibold tabular-nums leading-none">{label}</span>
        <Steps score={score} size="md" />
      </p>
      {summary ? <p className="mt-2 text-sm text-muted-foreground">{summary}</p> : null}
    </div>
  );
}

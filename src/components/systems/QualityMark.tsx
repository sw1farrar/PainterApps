"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  qualityIndex,
  type QualityClaimId,
  type QualityIndex as QualityResult,
} from "@/lib/systems/quality";
import type { TdsProduct } from "@/lib/systems/types";
import { cn } from "@/lib/utils";

function formatScore(score: number, locale: string) {
  return score.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function Steps({
  score,
  size,
}: {
  score: number;
  size: "sm" | "md";
}) {
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

function claimLabel(
  t: ReturnType<typeof useTranslations<"systems">>,
  claim: QualityResult["claims"][number],
) {
  if (claim.id === "warranty") {
    return t("qualityClaims.warranty", { years: claim.years ?? 0 });
  }
  return t(`qualityClaims.${claim.id as Exclude<QualityClaimId, "warranty">}`);
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
  const index = qualityIndex(product);
  if (index.score == null) return null;
  const label = formatScore(index.score, locale);

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
        <Steps score={index.score} size="sm" />
      </span>
    );
  }

  const solids =
    index.solidsPct == null
      ? null
      : t("qualitySolids", {
          n: index.solidsPct.toLocaleString(locale, { maximumFractionDigits: 1 }),
        });
  const resin = index.resin ? t(`qualityResins.${index.resin}`) : null;
  const pinned = index.claims.filter(
    (claim) => claim.id === "contractorLine" || claim.id === "extender",
  );
  const rest = index.claims
    .filter((claim) => claim.id !== "contractorLine" && claim.id !== "extender")
    .slice(0, 4);
  const factors = [solids, resin, ...pinned.map((claim) => claimLabel(t, claim)), ...rest.map((claim) => claimLabel(t, claim))]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {t("qualityIndex")}
        {" · "}
        {t(`qualityClasses.${index.applicationClass}`)}
      </p>
      <p className="mt-1 flex items-center gap-3">
        <span className="text-2xl font-semibold tabular-nums leading-none">{label}</span>
        <Steps score={index.score} size="md" />
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{factors}</p>
    </div>
  );
}

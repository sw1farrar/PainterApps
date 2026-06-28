import type { Locale } from "@/i18n/types";
import { SPANISH_WORKMANSHIP_COVERAGE } from "@/lib/sell-sheet/feature-catalog-es";
import {
  getCatalogItemByLabel,
} from "@/lib/sell-sheet/feature-catalog";
import { getCatalogLabel } from "@/lib/sell-sheet/feature-catalog-locale";
import type { SellSheetData, SellSheetTier } from "@/types/sell-sheet";

export const WORKMANSHIP_WARRANTY_IDS = [
  "warranty-1yr",
  "warranty-2yr",
  "warranty-5yr",
  "warranty-7yr",
  "warranty-10yr",
] as const;

export type WorkmanshipWarrantyId = (typeof WORKMANSHIP_WARRANTY_IDS)[number];

export function getWorkmanshipWarrantyOptions(locale: Locale = "en"): Array<{
  id: WorkmanshipWarrantyId;
  label: string;
}> {
  return WORKMANSHIP_WARRANTY_IDS.map((id) => ({
    id,
    label: getCatalogLabel(id, locale),
  }));
}

/** @deprecated Use getWorkmanshipWarrantyOptions(locale) */
export const WORKMANSHIP_WARRANTY_OPTIONS = getWorkmanshipWarrantyOptions("en");

const WORKMANSHIP_RANK: Record<(typeof WORKMANSHIP_WARRANTY_IDS)[number], number> =
  {
    "warranty-1yr": 1,
    "warranty-2yr": 2,
    "warranty-5yr": 5,
    "warranty-7yr": 7,
    "warranty-10yr": 10,
  };

function workmanshipCoverage(locale: Locale): string {
  return locale === "es"
    ? SPANISH_WORKMANSHIP_COVERAGE
    : "Workmanship warranty on all painted surfaces";
}

const workmanshipLabelSet = new Set(
  WORKMANSHIP_WARRANTY_IDS.flatMap((id) =>
    (["en", "es"] as Locale[]).map((locale) => getCatalogLabel(id, locale)),
  ),
);

export function isWorkmanshipWarrantyLabel(label: string): boolean {
  return workmanshipLabelSet.has(label);
}

export function isWarrantyFeatureLabel(label: string): boolean {
  return getCatalogItemByLabel(label)?.category === "warranty";
}

export function featuresForDisplay(features: string[]): string[] {
  return features.filter((feature) => !isWorkmanshipWarrantyLabel(feature));
}

export function resolveWorkmanshipWarrantyId(
  features: string[],
): WorkmanshipWarrantyId | null {
  let best: (typeof WORKMANSHIP_WARRANTY_IDS)[number] | null = null;
  let bestRank = 0;

  for (const feature of features) {
    const item = getCatalogItemByLabel(feature);
    if (!item || item.category !== "warranty") continue;
    if (!(item.id in WORKMANSHIP_RANK)) continue;

    const id = item.id as (typeof WORKMANSHIP_WARRANTY_IDS)[number];
    const rank = WORKMANSHIP_RANK[id];
    if (rank > bestRank) {
      bestRank = rank;
      best = id;
    }
  }

  return best;
}

export function syncTierWarrantyFromFeatures(
  tier: SellSheetTier,
  locale: Locale = "en",
): SellSheetTier {
  const warrantyId = resolveWorkmanshipWarrantyId(tier.features);

  if (!warrantyId) {
    return { ...tier, warrantyPeriod: "", warrantyCoverage: "" };
  }

  const period = warrantyId.replace("warranty-", "").replace("yr", "");
  return {
    ...tier,
    warrantyPeriod: period,
    warrantyCoverage: workmanshipCoverage(locale),
  };
}

export function syncAllTierWarranties(
  data: SellSheetData,
  locale: Locale = "en",
): SellSheetData {
  return {
    ...data,
    tiers: data.tiers.map((tier) => syncTierWarrantyFromFeatures(tier, locale)),
  };
}

export function selectedWorkmanshipWarrantyLabel(
  features: string[],
  locale: Locale = "en",
): string | null {
  const id = resolveWorkmanshipWarrantyId(features);
  if (!id) return null;
  return getCatalogLabel(id, locale);
}

export function inheritedWorkmanshipWarrantyLabel(
  inheritedFeatures: string[],
): string | null {
  return selectedWorkmanshipWarrantyLabel(inheritedFeatures);
}

export function workmanshipWarrantyRank(label: string): number {
  const item = getCatalogItemByLabel(label);
  if (!item || !(item.id in WORKMANSHIP_RANK)) return 0;
  return WORKMANSHIP_RANK[item.id as WorkmanshipWarrantyId];
}

export function isWorkmanshipWarrantyOptionDisabled(
  optionLabel: string,
  inheritedLabel: string | null,
): boolean {
  if (!inheritedLabel) return false;
  return (
    workmanshipWarrantyRank(optionLabel) <
    workmanshipWarrantyRank(inheritedLabel)
  );
}

export function stripCompetingWorkmanshipWarranties(
  features: string[],
  selectedLabel: string,
): string[] {
  if (!isWorkmanshipWarrantyLabel(selectedLabel)) return features;

  return features.filter(
    (feature) =>
      feature === selectedLabel || !isWorkmanshipWarrantyLabel(feature),
  );
}
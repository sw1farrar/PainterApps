import { getCatalogLabel } from "@/lib/sell-sheet/feature-catalog-locale";
import type { Locale } from "@/i18n/types";
import {
  enforceBenefitLimit,
  enforcePaintSystemLimit,
  mergePaintSystemOptionLists,
} from "@/lib/sell-sheet/sell-sheet-limits";
import {
  syncAllTierWarranties,
  syncTierWarrantyFromFeatures,
} from "@/lib/sell-sheet/warranty-from-features";
import type { SellSheetData, SellSheetTierKey } from "@/types/sell-sheet";

function labelsForIds(ids: string[], locale: Locale): string[] {
  return ids
    .map((id) => getCatalogLabel(id, locale))
    .filter((label): label is string => Boolean(label));
}

const GOOD_DEFAULT_IDS = [
  "pressure-wash",
  "hand-scrape",
  "caulking",
  "two-coat",
  "final-walkthrough",
  "same-day-cleanup",
  "warranty-1yr",
];

const BETTER_ADD_IDS = [
  "mildew-treatment",
  "spray-roll",
  "color-consult",
  "touch-up-kit",
  "warranty-2yr",
];

const BEST_ADD_IDS = [
  "full-prime",
  "project-manager",
  "annual-inspection",
  "manufacturer-warranty",
  "warranty-10yr",
];

function replaceWarrantyTier(
  features: string[],
  fromId: string,
  toId: string,
  locale: Locale,
): string[] {
  const fromLabels = (["en", "es"] as Locale[]).map((loc) =>
    getCatalogLabel(fromId, loc),
  );
  const toLabel = getCatalogLabel(toId, locale);
  if (!toLabel) return features;

  const withoutPrevious = features.filter((label) => !fromLabels.includes(label));
  return [...new Set([...withoutPrevious, toLabel])];
}

export function defaultFeaturesForTier(
  tierKey: SellSheetTierKey,
  locale: Locale = "en",
): string[] {
  const good = enforceBenefitLimit(labelsForIds(GOOD_DEFAULT_IDS, locale));

  if (tierKey === "good") return good;

  const better = enforceBenefitLimit(
    replaceWarrantyTier(
      [...new Set([...good, ...labelsForIds(BETTER_ADD_IDS, locale)])],
      "warranty-1yr",
      "warranty-2yr",
      locale,
    ),
  );

  if (tierKey === "better") return better;

  return enforceBenefitLimit(
    replaceWarrantyTier(
      [...new Set([...better, ...labelsForIds(BEST_ADD_IDS, locale)])],
      "warranty-2yr",
      "warranty-10yr",
      locale,
    ),
  );
}

export function tierNeedsDefaultFeatures(
  tierKey: SellSheetTierKey,
  features: string[] | null | undefined,
): boolean {
  return (features?.length ?? 0) === 0;
}

export function seedSellSheetWithDefaultFeatures(
  data: SellSheetData,
  locale: Locale = "en",
): SellSheetData {
  let changed = false;

  const tiers = data.tiers.map((tier) => {
    const needsDefaults = tierNeedsDefaultFeatures(tier.key, tier.features);
    const features = needsDefaults
      ? defaultFeaturesForTier(tier.key, locale)
      : enforceBenefitLimit(tier.features);
    const paintSystemFeatures = enforcePaintSystemLimit(
      tier.paintSystemFeatures ?? [],
    );
    const paintSystemFeatureOptions = mergePaintSystemOptionLists(
      tier.paintSystemFeatureOptions,
      paintSystemFeatures,
    );

    if (
      needsDefaults ||
      features.length !== tier.features.length ||
      paintSystemFeatures.length !== (tier.paintSystemFeatures ?? []).length ||
      paintSystemFeatureOptions.length !==
        (tier.paintSystemFeatureOptions ?? []).length
    ) {
      changed = true;
    }

    return syncTierWarrantyFromFeatures(
      {
        ...tier,
        features,
        paintSystemFeatureOptions,
        paintSystemFeatures,
      },
      locale,
    );
  });

  if (!changed) return data;

  return syncAllTierWarranties(
    {
      ...data,
      tiers,
    },
    locale,
  );
}
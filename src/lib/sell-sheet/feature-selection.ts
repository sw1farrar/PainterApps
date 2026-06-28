import type { Locale } from "@/i18n/types";
import {
  benefitLibraryLabels,
  filterLibraryItemsForApplication,
  type BenefitLibrary,
} from "@/lib/sell-sheet/benefit-library";
import { isCatalogFeature } from "@/lib/sell-sheet/feature-catalog";
import { visibleCatalogLabelsForLocale } from "@/lib/sell-sheet/feature-catalog-scope";
import type { SellSheetApplicationType } from "@/types/sell-sheet";
import {
  inheritedWorkmanshipWarrantyLabel,
  isWorkmanshipWarrantyLabel,
  stripCompetingWorkmanshipWarranties,
  syncAllTierWarranties,
  syncTierWarrantyFromFeatures,
} from "@/lib/sell-sheet/warranty-from-features";
import {
  BENEFITS_TIER_MAX,
  canAddDisplayBenefit,
  countDisplayBenefits,
  enforceBenefitLimit,
} from "@/lib/sell-sheet/sell-sheet-limits";
import { updateTier } from "@/lib/sell-sheet/utils";
import { featuresForDisplay } from "@/lib/sell-sheet/warranty-from-features";
import type { SellSheetData, SellSheetTierKey } from "@/types/sell-sheet";

function tierFeatures(data: SellSheetData, key: SellSheetTierKey): string[] {
  return data.tiers.find((tier) => tier.key === key)?.features ?? [];
}

function catalogFeatures(features: string[]): string[] {
  return features.filter(isCatalogFeature);
}

function customFeatures(features: string[]): string[] {
  return features.filter((feature) => !isCatalogFeature(feature));
}

function setTierCatalogPreservingCustom(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
  catalogLabels: string[],
): SellSheetData {
  const custom = customFeatures(tierFeatures(data, tierKey));
  const uniqueCatalog = [...new Set(catalogLabels)];
  const tier = data.tiers.find((item) => item.key === tierKey);
  if (!tier) return data;

  return updateTier(
    data,
    tierKey,
    syncTierWarrantyFromFeatures({
      ...tier,
      features: [...uniqueCatalog, ...custom],
    }),
  );
}

export function getInheritedFeatures(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
): string[] {
  if (tierKey === "good") return [];

  const goodCatalog = catalogFeatures(tierFeatures(data, "good"));
  if (tierKey === "better") return goodCatalog;

  const betterCatalog = catalogFeatures(tierFeatures(data, "better"));
  return [...new Set([...goodCatalog, ...betterCatalog])];
}

export function applyFeatureUpdate(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
  features: string[],
): SellSheetData {
  const limitedFeatures = enforceBenefitLimit(features);
  const catalogSelected = catalogFeatures(limitedFeatures);
  let next = updateTier(data, tierKey, { features: limitedFeatures });

  if (tierKey === "good") {
    const previousGoodCatalog = catalogFeatures(tierFeatures(data, "good"));
    const betterCatalogBefore = catalogFeatures(tierFeatures(data, "better"));
    const betterOnly = betterCatalogBefore.filter(
      (label) => !previousGoodCatalog.includes(label),
    );
    const newBetterCatalog = [...new Set([...catalogSelected, ...betterOnly])];
    next = setTierCatalogPreservingCustom(next, "better", newBetterCatalog);

    const bestCatalogBefore = catalogFeatures(tierFeatures(data, "best"));
    const bestOnly = bestCatalogBefore.filter(
      (label) =>
        !betterCatalogBefore.includes(label) &&
        !previousGoodCatalog.includes(label),
    );
    const newBestCatalog = [...new Set([...newBetterCatalog, ...bestOnly])];
    next = setTierCatalogPreservingCustom(next, "best", newBestCatalog);
  } else if (tierKey === "better") {
    const goodCatalog = catalogFeatures(tierFeatures(next, "good"));
    const previousBetterCatalog = catalogFeatures(tierFeatures(data, "better"));
    const bestCatalogBefore = catalogFeatures(tierFeatures(data, "best"));
    const bestOnly = bestCatalogBefore.filter(
      (label) =>
        !previousBetterCatalog.includes(label) && !goodCatalog.includes(label),
    );
    const newBestCatalog = [...new Set([...catalogSelected, ...bestOnly])];
    next = setTierCatalogPreservingCustom(next, "best", newBestCatalog);
  }

  return syncAllTierWarranties(next);
}

export function tierOnlyBenefits(
  features: string[],
  library: BenefitLibrary | string[],
): string[] {
  const librarySet = new Set(
    Array.isArray(library) ? library : benefitLibraryLabels(library),
  );
  return features.filter(
    (feature) => !isCatalogFeature(feature) && !librarySet.has(feature),
  );
}

export function selectAllCatalogFeatures(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
  locale: Locale = "en",
  options?: {
    applicationType?: SellSheetApplicationType | "";
    hiddenCatalogIds?: string[];
  },
): SellSheetData {
  const applicationType = options?.applicationType ?? data.applicationType;
  const hiddenCatalogIds = options?.hiddenCatalogIds ?? [];
  const inherited = new Set(getInheritedFeatures(data, tierKey));
  const current = tierFeatures(data, tierKey);
  const next = [...current];

  for (const label of visibleCatalogLabelsForLocale(
    locale,
    applicationType,
    hiddenCatalogIds,
  )) {
    if (inherited.has(label) || next.includes(label)) continue;
    if (!canAddDisplayBenefit(next, label)) break;
    next.push(label);
  }

  return applyFeatureUpdate(data, tierKey, next);
}

export function tierOwnedCatalogFeatures(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
): string[] {
  const inherited = new Set(getInheritedFeatures(data, tierKey));
  return catalogFeatures(tierFeatures(data, tierKey)).filter(
    (label) => !inherited.has(label),
  );
}

export function tierOwnedBenefitFeatures(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
): string[] {
  const inherited = new Set(getInheritedFeatures(data, tierKey));
  return tierFeatures(data, tierKey).filter((feature) => !inherited.has(feature));
}

/** Remove every benefit selected on this package (catalog, library, custom). Keeps lower-tier inherited items only. */
export function clearAllPackageBenefits(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
): SellSheetData {
  const inherited = getInheritedFeatures(data, tierKey);
  const inheritedWarranty = inheritedWorkmanshipWarrantyLabel(inherited);
  let features = [...inherited];

  if (inheritedWarranty) {
    features = stripCompetingWorkmanshipWarranties(features, inheritedWarranty);
    if (!features.includes(inheritedWarranty)) {
      features = [...features, inheritedWarranty];
    }
  }

  return applyFeatureUpdate(data, tierKey, features);
}

export function clearAllCatalogFeatures(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
): SellSheetData {
  return clearAllPackageBenefits(data, tierKey);
}

export function selectAllLibraryBenefits(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
  library: BenefitLibrary | string[],
  applicationType: SellSheetApplicationType | "" = data.applicationType,
): SellSheetData {
  const current = tierFeatures(data, tierKey);
  const next = [...current];
  const labels = Array.isArray(library)
    ? library
    : filterLibraryItemsForApplication(library, applicationType).map(
        (item) => item.label,
      );

  for (const label of labels) {
    if (next.includes(label)) continue;
    if (!canAddDisplayBenefit(next, label)) break;
    next.push(label);
  }

  return applyFeatureUpdate(data, tierKey, next);
}

export function clearAllLibraryBenefits(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
): SellSheetData {
  return clearAllPackageBenefits(data, tierKey);
}

export function toggleLibraryBenefit(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
  label: string,
  selected: boolean,
): SellSheetData {
  const current = tierFeatures(data, tierKey);
  if (selected && !canAddDisplayBenefit(current, label)) {
    return data;
  }

  const next = selected
    ? [...current, label]
    : current.filter((feature) => feature !== label);
  return applyFeatureUpdate(data, tierKey, next);
}

export function removeBenefitFromAllTiers(
  data: SellSheetData,
  label: string,
): SellSheetData {
  return {
    ...data,
    tiers: data.tiers.map((tier) => ({
      ...tier,
      features: tier.features.filter((feature) => feature !== label),
    })),
  };
}

export function toggleCatalogFeature(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
  label: string,
  selected: boolean,
): SellSheetData {
  const current = tierFeatures(data, tierKey);
  const inherited = getInheritedFeatures(data, tierKey);

  if (!selected && inherited.includes(label)) {
    return data;
  }

  if (selected && !canAddDisplayBenefit(current, label)) {
    return data;
  }

  let nextFeatures = selected
    ? [...current, label]
    : current.filter((feature) => feature !== label);

  if (selected) {
    nextFeatures = stripCompetingWorkmanshipWarranties(nextFeatures, label);
  }

  return applyFeatureUpdate(data, tierKey, nextFeatures);
}

export function isBenefitsTierAtLimit(features: string[]): boolean {
  return countDisplayBenefits(features) >= BENEFITS_TIER_MAX;
}

export function setWorkmanshipWarranty(
  data: SellSheetData,
  tierKey: SellSheetTierKey,
  label: string | null,
): SellSheetData {
  const inherited = getInheritedFeatures(data, tierKey);
  const inheritedWarranty = inheritedWorkmanshipWarrantyLabel(inherited);
  const current = tierFeatures(data, tierKey);

  if (!label) {
    if (inheritedWarranty) {
      const next = stripCompetingWorkmanshipWarranties(
        current,
        inheritedWarranty,
      );
      const withInherited = next.includes(inheritedWarranty)
        ? next
        : [...next, inheritedWarranty];
      return applyFeatureUpdate(data, tierKey, withInherited);
    }

    return applyFeatureUpdate(
      data,
      tierKey,
      current.filter((feature) => !isWorkmanshipWarrantyLabel(feature)),
    );
  }

  if (!isWorkmanshipWarrantyLabel(label)) return data;

  let next = stripCompetingWorkmanshipWarranties(current, label);
  if (!next.includes(label)) {
    next = [...next, label];
  }

  return applyFeatureUpdate(data, tierKey, next);
}

export function benefitsLimitHintCount(features: string[]): {
  selected: number;
  max: number;
} {
  return {
    selected: featuresForDisplay(features).length,
    max: BENEFITS_TIER_MAX,
  };
}
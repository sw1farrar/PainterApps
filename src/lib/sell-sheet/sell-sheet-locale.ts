import { messages } from "@/i18n";
import type { Locale } from "@/i18n/types";
import {
  translateFeatureLabel,
} from "@/lib/sell-sheet/feature-catalog-locale";
import { syncAllTierWarranties } from "@/lib/sell-sheet/warranty-from-features";
import type { SellSheetData, SellSheetTierKey, SellSheetTierLabels } from "@/types/sell-sheet";

function tierLabelForLocale(
  locale: Locale,
  key: SellSheetTierKey,
): string {
  return messages[locale].sellSheet.tierLabels[key];
}

export function applyLocaleToSellSheetData(
  data: SellSheetData,
  locale: Locale,
  previousLocale?: Locale,
): SellSheetData {
  const tierLabels = messages[locale].sellSheet.tierLabels;
  const previousTierLabels = previousLocale
    ? messages[previousLocale].sellSheet.tierLabels
    : undefined;

  const tiers = data.tiers.map((tier) => {
    let displayName = tier.displayName;

    if (previousTierLabels) {
      const prevDefault = previousTierLabels[tier.key];
      const allDefaults = (["en", "es"] as Locale[]).map((loc) =>
        tierLabelForLocale(loc, tier.key),
      );
      if (
        displayName === prevDefault ||
        (allDefaults.includes(displayName) &&
          displayName !== tierLabels[tier.key])
      ) {
        displayName = tierLabels[tier.key];
      }
    }

    const features = tier.features.map((feature) =>
      translateFeatureLabel(feature, locale),
    );

    return {
      ...tier,
      displayName,
      features,
    };
  });

  return syncAllTierWarranties(
    {
      ...data,
      tiers,
    },
    locale,
  );
}
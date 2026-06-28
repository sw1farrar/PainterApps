import type { Locale } from "@/i18n/types";
import {
  SELL_SHEET_FEATURE_CATALOG,
  SELL_SHEET_FEATURE_CATEGORIES,
  type SellSheetFeatureCatalogItem,
  type SellSheetFeatureCategoryId,
  type SellSheetFeatureScope,
} from "@/lib/sell-sheet/feature-catalog-data";
import {
  catalogItemsByCategoryForLocale,
  getCatalogItemByAnyLabel,
  isKnownCatalogLabel,
} from "@/lib/sell-sheet/feature-catalog-locale";

export {
  SELL_SHEET_FEATURE_CATALOG,
  SELL_SHEET_FEATURE_CATEGORIES,
  type SellSheetFeatureCatalogItem,
  type SellSheetFeatureCategoryId,
  type SellSheetFeatureScope,
};

export {
  catalogItemMatchesApplication,
  filterCatalogItemsByScope,
  filterVisibleCatalogItems,
  isCatalogItemVisible,
  visibleCatalogLabelsForLocale,
} from "@/lib/sell-sheet/feature-catalog-scope";

export function isCatalogFeature(label: string): boolean {
  return isKnownCatalogLabel(label);
}

export function getCatalogItemByLabel(
  label: string,
): SellSheetFeatureCatalogItem | undefined {
  return getCatalogItemByAnyLabel(label);
}

export function catalogItemsByCategory(
  categoryId: SellSheetFeatureCategoryId,
  locale: Locale = "en",
): SellSheetFeatureCatalogItem[] {
  return catalogItemsByCategoryForLocale(categoryId, locale);
}
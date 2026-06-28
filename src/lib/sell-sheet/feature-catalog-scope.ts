import type { Locale } from "@/i18n/types";
import type { SellSheetApplicationType } from "@/types/sell-sheet";
import {
  SELL_SHEET_FEATURE_CATALOG,
  type SellSheetFeatureCatalogItem,
  type SellSheetFeatureScope,
} from "@/lib/sell-sheet/feature-catalog-data";
import { getLocalizedFeatureCatalog } from "@/lib/sell-sheet/feature-catalog-locale";

export function catalogItemMatchesApplication(
  item: { scope: SellSheetFeatureScope },
  applicationType: SellSheetApplicationType | "",
): boolean {
  if (!applicationType) return false;
  if (item.scope === "both") return true;
  return item.scope === applicationType;
}

export function isCatalogItemVisible(
  catalogId: string,
  hiddenCatalogIds: string[],
): boolean {
  return !hiddenCatalogIds.includes(catalogId);
}

export function filterCatalogItemsByScope(
  items: SellSheetFeatureCatalogItem[],
  scopeView: SellSheetApplicationType,
): SellSheetFeatureCatalogItem[] {
  return items.filter((item) => catalogItemMatchesApplication(item, scopeView));
}

export function filterVisibleCatalogItems(
  items: SellSheetFeatureCatalogItem[],
  applicationType: SellSheetApplicationType | "",
  hiddenCatalogIds: string[],
): SellSheetFeatureCatalogItem[] {
  return items.filter(
    (item) =>
      isCatalogItemVisible(item.id, hiddenCatalogIds) &&
      catalogItemMatchesApplication(item, applicationType),
  );
}

export function visibleCatalogLabelsForLocale(
  locale: Locale,
  applicationType: SellSheetApplicationType | "",
  hiddenCatalogIds: string[],
): string[] {
  return filterVisibleCatalogItems(
    getLocalizedFeatureCatalog(locale),
    applicationType,
    hiddenCatalogIds,
  ).map((item) => item.label);
}

export function getCatalogItemScope(catalogId: string): SellSheetFeatureScope {
  return (
    SELL_SHEET_FEATURE_CATALOG.find((item) => item.id === catalogId)?.scope ??
    "both"
  );
}
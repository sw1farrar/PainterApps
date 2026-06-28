import type { Locale } from "@/i18n/types";
import {
  SELL_SHEET_FEATURE_CATALOG,
  type SellSheetFeatureCatalogItem,
  type SellSheetFeatureCategoryId,
} from "@/lib/sell-sheet/feature-catalog-data";
import { SPANISH_FEATURE_LABELS } from "@/lib/sell-sheet/feature-catalog-es";

const catalogById = new Map(
  SELL_SHEET_FEATURE_CATALOG.map((item) => [item.id, item]),
);

const labelToId = new Map<string, string>();

for (const item of SELL_SHEET_FEATURE_CATALOG) {
  labelToId.set(item.label, item.id);
  const spanish = SPANISH_FEATURE_LABELS[item.id];
  if (spanish) {
    labelToId.set(spanish, item.id);
  }
}

export function getCatalogLabel(id: string, locale: Locale): string {
  if (locale === "es") {
    return SPANISH_FEATURE_LABELS[id] ?? catalogById.get(id)?.label ?? id;
  }
  return catalogById.get(id)?.label ?? id;
}

export function getLocalizedFeatureCatalog(
  locale: Locale,
): SellSheetFeatureCatalogItem[] {
  return SELL_SHEET_FEATURE_CATALOG.map((item) => ({
    ...item,
    label: getCatalogLabel(item.id, locale),
  }));
}

export function getCatalogItemByAnyLabel(
  label: string,
): SellSheetFeatureCatalogItem | undefined {
  const id = labelToId.get(label);
  if (!id) return undefined;
  const base = catalogById.get(id);
  if (!base) return undefined;
  return base;
}

export function isKnownCatalogLabel(label: string): boolean {
  return labelToId.has(label);
}

export function translateFeatureLabel(label: string, locale: Locale): string {
  const item = getCatalogItemByAnyLabel(label);
  if (!item) return label;
  return getCatalogLabel(item.id, locale);
}

export function catalogItemsByCategoryForLocale(
  categoryId: SellSheetFeatureCategoryId,
  locale: Locale,
): SellSheetFeatureCatalogItem[] {
  return getLocalizedFeatureCatalog(locale).filter(
    (item) => item.category === categoryId,
  );
}

export function allCatalogLabelsForLocale(locale: Locale): string[] {
  return getLocalizedFeatureCatalog(locale).map((item) => item.label);
}
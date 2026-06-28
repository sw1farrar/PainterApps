import {
  isValidLibraryLabel,
  normalizeLibraryLabel,
} from "@/lib/sell-sheet/company-library";
import type {
  SellSheetFeatureCategoryId,
  SellSheetFeatureScope,
} from "@/lib/sell-sheet/feature-catalog-data";
import { catalogItemMatchesApplication } from "@/lib/sell-sheet/feature-catalog-scope";
import type { SellSheetApplicationType } from "@/types/sell-sheet";

export type BenefitLibraryCustomItem = {
  label: string;
  category: SellSheetFeatureCategoryId;
  scope: SellSheetFeatureScope;
};

export type BenefitLibrary = {
  version: 1;
  custom: BenefitLibraryCustomItem[];
  hiddenCatalogIds: string[];
};

export const EMPTY_BENEFIT_LIBRARY: BenefitLibrary = {
  version: 1,
  custom: [],
  hiddenCatalogIds: [],
};

const SCOPES: SellSheetFeatureScope[] = ["interior", "exterior", "both"];
const CATEGORIES: SellSheetFeatureCategoryId[] = [
  "prep",
  "paint",
  "warranty",
  "maintenance",
  "service",
];

function parseHiddenIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string" || !entry.trim()) continue;
    const id = entry.trim();
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

function parseCustomItems(value: unknown): BenefitLibraryCustomItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: BenefitLibraryCustomItem[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    if (typeof raw.label !== "string") continue;

    const label = normalizeLibraryLabel(raw.label);
    if (!isValidLibraryLabel(label) || seen.has(label)) continue;

    const category = CATEGORIES.includes(
      raw.category as SellSheetFeatureCategoryId,
    )
      ? (raw.category as SellSheetFeatureCategoryId)
      : "service";
    const scope = SCOPES.includes(raw.scope as SellSheetFeatureScope)
      ? (raw.scope as SellSheetFeatureScope)
      : "both";

    seen.add(label);
    items.push({ label, category, scope });
  }

  return items;
}

/** Parses company benefit library JSON (legacy string[] or structured v1). */
export function parseBenefitLibrary(value: unknown): BenefitLibrary {
  if (Array.isArray(value)) {
    const custom: BenefitLibraryCustomItem[] = [];
    const seen = new Set<string>();

    for (const entry of value) {
      if (typeof entry !== "string") continue;
      const label = normalizeLibraryLabel(entry);
      if (!isValidLibraryLabel(label) || seen.has(label)) continue;
      seen.add(label);
      custom.push({ label, category: "service", scope: "both" });
    }

    return { version: 1, custom, hiddenCatalogIds: [] };
  }

  if (!value || typeof value !== "object") {
    return { ...EMPTY_BENEFIT_LIBRARY };
  }

  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) {
    return { ...EMPTY_BENEFIT_LIBRARY };
  }

  return {
    version: 1,
    custom: parseCustomItems(raw.custom),
    hiddenCatalogIds: parseHiddenIds(raw.hiddenCatalogIds),
  };
}

export function benefitLibraryLabels(library: BenefitLibrary): string[] {
  return library.custom.map((item) => item.label);
}

export function filterLibraryItemsForApplication(
  library: BenefitLibrary,
  applicationType: SellSheetApplicationType | "",
): BenefitLibraryCustomItem[] {
  if (!applicationType) return [];
  return library.custom.filter((item) =>
    catalogItemMatchesApplication(item, applicationType),
  );
}

export function findLibraryItem(
  library: BenefitLibrary,
  label: string,
): BenefitLibraryCustomItem | undefined {
  const normalized = normalizeLibraryLabel(label);
  return library.custom.find((item) => item.label === normalized);
}

export function libraryItemsForScopeColumn(
  library: BenefitLibrary,
  column: "interior" | "exterior",
): BenefitLibraryCustomItem[] {
  return library.custom.filter(
    (item) => item.scope === column || item.scope === "both",
  );
}

export function libraryItemsInCategory(
  items: BenefitLibraryCustomItem[],
  category: SellSheetFeatureCategoryId,
): BenefitLibraryCustomItem[] {
  return items.filter((item) => item.category === category);
}

export function customItemsForCategoryAndScope(
  library: BenefitLibrary,
  category: SellSheetFeatureCategoryId,
  scopeView: SellSheetApplicationType,
): BenefitLibraryCustomItem[] {
  return library.custom.filter(
    (item) =>
      item.category === category &&
      catalogItemMatchesApplication(item, scopeView),
  );
}

export function addLocalLibraryItem(
  library: BenefitLibrary,
  item: BenefitLibraryCustomItem,
): BenefitLibrary | { error: string } {
  const label = normalizeLibraryLabel(item.label);
  if (!isValidLibraryLabel(label)) {
    return { error: "Enter a valid library item." };
  }

  if (library.custom.some((entry) => entry.label === label)) {
    return { error: "That item is already in your library." };
  }

  return {
    ...library,
    custom: [...library.custom, { ...item, label }],
  };
}

export function removeLocalLibraryItem(
  library: BenefitLibrary,
  label: string,
): BenefitLibrary {
  const normalized = normalizeLibraryLabel(label);
  return {
    ...library,
    custom: library.custom.filter((item) => item.label !== normalized),
  };
}

/** Merges a guest draft library into the company's persisted library. */
export function mergeBenefitLibraries(
  existing: BenefitLibrary,
  incoming: BenefitLibrary,
): BenefitLibrary {
  const customLabels = new Set(existing.custom.map((item) => item.label));
  const mergedCustom = [...existing.custom];

  for (const item of incoming.custom) {
    if (customLabels.has(item.label)) continue;
    customLabels.add(item.label);
    mergedCustom.push(item);
  }

  const hiddenIds = new Set(existing.hiddenCatalogIds);
  for (const id of incoming.hiddenCatalogIds) {
    hiddenIds.add(id);
  }

  return {
    version: 1,
    custom: mergedCustom,
    hiddenCatalogIds: [...hiddenIds],
  };
}

export function benefitLibraryHasContent(library: BenefitLibrary): boolean {
  return library.custom.length > 0 || library.hiddenCatalogIds.length > 0;
}
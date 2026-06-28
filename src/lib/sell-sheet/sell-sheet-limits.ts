import {
  featuresForDisplay,
  isWorkmanshipWarrantyLabel,
} from "@/lib/sell-sheet/warranty-from-features";

/** Max paint-system bullets shown per package on one page. */
export const PAINT_SYSTEM_TIER_MAX = 2;

/** Max coating specs kept in the per-package discovery pool. */
export const PAINT_SYSTEM_OPTIONS_MAX = 16;

/** Target minimum specs AI should extract from the manufacturer page. */
export const PAINT_SYSTEM_DISCOVERY_TARGET_MIN = 10;

/** Max benefit lines shown per package column on one page. */
export const BENEFITS_TIER_MAX = 12;

export function countDisplayBenefits(features: string[]): number {
  return featuresForDisplay(features).length;
}

export function benefitsForDisplay(features: string[]): string[] {
  return featuresForDisplay(features).slice(0, BENEFITS_TIER_MAX);
}

export function isBenefitsTierAtLimit(features: string[]): boolean {
  return countDisplayBenefits(features) >= BENEFITS_TIER_MAX;
}

export function canAddDisplayBenefit(
  features: string[],
  label: string,
): boolean {
  if (features.includes(label)) return true;
  if (isWorkmanshipWarrantyLabel(label)) return true;

  const trial = [...features, label];
  return countDisplayBenefits(trial) <= BENEFITS_TIER_MAX;
}

export function enforceBenefitLimit(features: string[]): string[] {
  if (countDisplayBenefits(features) <= BENEFITS_TIER_MAX) {
    return features;
  }

  const kept: string[] = [];
  let displayCount = 0;

  for (const feature of features) {
    if (isWorkmanshipWarrantyLabel(feature)) {
      kept.push(feature);
      continue;
    }

    if (!featuresForDisplay([feature]).length) {
      kept.push(feature);
      continue;
    }

    if (displayCount >= BENEFITS_TIER_MAX) continue;

    kept.push(feature);
    displayCount += 1;
  }

  return kept;
}

export function enforcePaintSystemLimit(features: string[]): string[] {
  return features.slice(0, PAINT_SYSTEM_TIER_MAX);
}

export function enforcePaintSystemOptionsLimit(features: string[]): string[] {
  return features.slice(0, PAINT_SYSTEM_OPTIONS_MAX);
}

export function mergePaintSystemOptionLists(
  ...lists: Array<string[] | undefined | null>
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const list of lists) {
    if (!list) continue;
    for (const item of list) {
      const trimmed = item.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      merged.push(trimmed);
    }
  }

  return enforcePaintSystemOptionsLimit(merged);
}

export function paintSystemSelectablePool(input: {
  options: string[];
  library?: string[];
  selected?: string[];
}): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const list of [input.options, input.library, input.selected]) {
    if (!list) continue;
    for (const item of list) {
      const trimmed = item.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      merged.push(trimmed);
    }
  }

  return merged;
}

export function defaultPaintSystemSelection(options: string[]): string[] {
  return enforcePaintSystemLimit(options);
}

export function applyDiscoveredPaintSystemFeatures(
  discovered: string[],
  previousOptions: string[] = [],
): {
  options: string[];
  selected: string[];
} {
  const options = mergePaintSystemOptionLists(previousOptions, discovered);
  return {
    options,
    selected: defaultPaintSystemSelection(options),
  };
}

export function canAddPaintSystemFeature(
  features: string[],
  label: string,
): boolean {
  if (features.includes(label)) return true;
  return features.length < PAINT_SYSTEM_TIER_MAX;
}

export function canAddPaintSystemOption(
  options: string[],
  label: string,
): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  if (options.includes(trimmed)) return true;
  return options.length < PAINT_SYSTEM_OPTIONS_MAX;
}
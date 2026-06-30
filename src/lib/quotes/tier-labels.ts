import {
  isQuotePaintTier,
  QUOTE_PAINT_TIERS,
  type QuotePaintTier,
} from "@/lib/paint-library/types";
import type { QuoteTierName } from "@/types/database";

export const QUOTE_TIER_LABELS: Record<QuotePaintTier, string> = {
  good: "Good",
  better: "Better",
  best: "Best",
};

/** Upgrade tiers configured in estimate defaults — Good is derived from baseline. */
export const ESTIMATE_UPGRADE_TIERS = ["better", "best"] as const;
export type EstimateUpgradeTier = (typeof ESTIMATE_UPGRADE_TIERS)[number];

export const ESTIMATE_TIER_SETUP_DESCRIPTIONS: Record<
  QuotePaintTier,
  string
> = {
  good:
    "Your standard package — uses the wall primer and finish you set in Default paint by surface above. This is the baseline option at your quoted price.",
  better:
    "A step up from Good — upgraded primer and/or finish, with optional extra labor for better prep and application quality.",
  best:
    "Your premium package — top-tier products and the highest level of prep and finish you offer customers.",
};

/** Customer-facing label; legacy DB tier `beautiful` maps to a neutral name. */
export function formatQuoteTierLabel(tier: QuoteTierName | string): string {
  if (tier === "beautiful") return "Legacy package";
  if (isQuotePaintTier(tier)) return QUOTE_TIER_LABELS[tier];
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function filterActiveQuoteTiers<T extends { tier: string }>(tiers: T[]): T[] {
  return tiers.filter((row) => isQuotePaintTier(row.tier));
}

export { QUOTE_PAINT_TIERS };
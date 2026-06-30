export const XAI_MODEL_TIERS = ["premium", "economy"] as const;

export type XaiModelTier = (typeof XAI_MODEL_TIERS)[number];

export type XaiModelTierMeta = {
  tier: XaiModelTier;
  label: string;
  description: string;
  modelId: string;
  inputPricePerMillion: string;
  outputPricePerMillion: string;
};

/** Cheapest xAI chat model on the public API (per xAI pricing docs). */
export const CHEAPEST_XAI_MODEL_ID = "grok-build-0.1";

export const XAI_MODEL_TIER_META: Record<XaiModelTier, XaiModelTierMeta> = {
  premium: {
    tier: "premium",
    label: "Premium (latest)",
    description:
      "Best quality for product enrichment, can-image vision, and web search.",
    modelId: "grok-4.3",
    inputPricePerMillion: "$1.25",
    outputPricePerMillion: "$2.50",
  },
  economy: {
    tier: "economy",
    label: "Economy",
    description:
      "Lower cost ($1.00 / $2.00 per 1M tokens). Supports vision, web search, and structured JSON for catalog work.",
    modelId: CHEAPEST_XAI_MODEL_ID,
    inputPricePerMillion: "$1.00",
    outputPricePerMillion: "$2.00",
  },
};

export const DEFAULT_XAI_MODEL_TIER: XaiModelTier = "premium";

export const DEFAULT_XAI_MODEL_ID =
  XAI_MODEL_TIER_META[DEFAULT_XAI_MODEL_TIER].modelId;

export function isXaiModelTier(value: string): value is XaiModelTier {
  return (XAI_MODEL_TIERS as readonly string[]).includes(value);
}

export function xaiModelIdForTier(tier: XaiModelTier): string {
  return XAI_MODEL_TIER_META[tier].modelId;
}

export function xaiModelTierFromModelId(modelId: string): XaiModelTier | null {
  const normalized = modelId.trim().toLowerCase();
  for (const tier of XAI_MODEL_TIERS) {
    if (XAI_MODEL_TIER_META[tier].modelId === normalized) {
      return tier;
    }
  }
  return null;
}
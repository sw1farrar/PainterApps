import {
  defaultFeaturesForTier,
  seedSellSheetWithDefaultFeatures,
} from "@/lib/sell-sheet/feature-defaults";
import type { Locale } from "@/i18n/types";
import { syncTierWarrantyFromFeatures } from "@/lib/sell-sheet/warranty-from-features";
import {
  SELL_SHEET_TIER_KEYS,
  type SellSheetApplicationType,
  type SellSheetData,
  type SellSheetTier,
  type SellSheetTierKey,
  type SellSheetTierLabels,
} from "@/types/sell-sheet";

export type SellSheetApplicationLabels = {
  interior: string;
  exterior: string;
};

export type TierDisplayNameParts = {
  primary: string;
  secondary: string | null;
};

export function parseTierDisplayName(displayName: string): TierDisplayNameParts {
  const trimmed = displayName.trim();
  const match = trimmed.match(/^(.+?)\s+[—–-]\s+(.+)$/);

  if (match) {
    return {
      primary: match[1].trim(),
      secondary: match[2].trim(),
    };
  }

  return { primary: trimmed, secondary: null };
}

/** Stable serialization for PDF preview regeneration — avoids object-identity loops. */
export function sellSheetPdfPayloadKey(data: SellSheetData): string {
  return JSON.stringify({
    companyName: data.companyName,
    projectName: data.projectName,
    applicationType: data.applicationType,
    logoImage: data.logoImage,
    tiers: data.tiers.map((tier) => ({
      key: tier.key,
      displayName: tier.displayName,
      manufacturer: tier.manufacturer,
      paintType: tier.paintType,
      paintSystemFeatures: tier.paintSystemFeatures,
      features: tier.features,
      warrantyPeriod: tier.warrantyPeriod,
      warrantyCoverage: tier.warrantyCoverage,
      paintCanImage: tier.paintCanImage,
    })),
  });
}

export function sellSheetApplicationSystemLabel(
  applicationType: SellSheetApplicationType | "",
  labels: SellSheetApplicationLabels,
): string | null {
  if (applicationType === "interior") return labels.interior;
  if (applicationType === "exterior") return labels.exterior;
  return null;
}

export const SELL_SHEET_TAGLINE =
  "Choose the system that fits your project.";

export type WarrantyPeriodDisplay = {
  value: string;
  unit: string | null;
};

export function formatWarrantyPeriod(period: string): WarrantyPeriodDisplay {
  const trimmed = period.trim();
  if (!trimmed) {
    return { value: "", unit: null };
  }

  if (/^lifetime$/i.test(trimmed)) {
    return { value: "Lifetime", unit: null };
  }

  const match = trimmed.match(/^(\d+)\s*[-]?\s*(year|years|yr|yrs)?/i);
  if (match) {
    const num = match[1];
    const unitWord = match[2];
    const unit =
      unitWord === undefined
        ? null
        : Number(num) === 1
          ? "Year"
          : "Years";
    return { value: num, unit };
  }

  return { value: trimmed, unit: null };
}

export function createEmptyTier(
  key: SellSheetTierKey,
  displayName: string,
  locale: Locale = "en",
): SellSheetTier {
  return syncTierWarrantyFromFeatures({
    ...buildBlankTier(key, displayName),
    features: defaultFeaturesForTier(key, locale),
  });
}

function buildBlankTier(
  key: SellSheetTierKey,
  displayName: string,
): SellSheetTier {
  return {
    key,
    displayName,
    manufacturer: "",
    paintType: "",
    paintSystemFeatureOptions: [],
    paintSystemFeatures: [],
    features: [],
    warrantyPeriod: "",
    warrantyCoverage: "",
    paintCanImage: null,
  };
}

export function createEmptySellSheet(
  tierLabels: SellSheetTierLabels,
  locale: Locale = "en",
): SellSheetData {
  return seedSellSheetWithDefaultFeatures(
    {
      companyName: "",
      projectName: "",
      applicationType: "",
      logoImage: null,
      tiers: SELL_SHEET_TIER_KEYS.map((key) =>
        createEmptyTier(key, tierLabels[key], locale),
      ),
    },
    locale,
  );
}

export function updateTier(
  data: SellSheetData,
  key: SellSheetTierKey,
  patch: Partial<SellSheetTier>,
): SellSheetData {
  return {
    ...data,
    tiers: data.tiers.map((tier) =>
      tier.key === key ? { ...tier, ...patch } : tier,
    ),
  };
}
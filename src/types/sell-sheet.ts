export const SELL_SHEET_TIER_KEYS = ["good", "better", "best"] as const;

export type SellSheetTierKey = (typeof SELL_SHEET_TIER_KEYS)[number];

export const SELL_SHEET_APPLICATION_TYPES = ["interior", "exterior"] as const;

export type SellSheetApplicationType =
  (typeof SELL_SHEET_APPLICATION_TYPES)[number];

export type SellSheetTier = {
  key: SellSheetTierKey;
  displayName: string;
  manufacturer: string;
  paintType: string;
  /** All coating specs discovered for this package (AI or manual). */
  paintSystemFeatureOptions: string[];
  /** Up to 2 coating specs selected for the sell sheet. */
  paintSystemFeatures: string[];
  /** Contractor package benefits (prep, scope, warranty, service). */
  features: string[];
  warrantyPeriod: string;
  warrantyCoverage: string;
  paintCanImage: string | null;
};

export type SellSheetData = {
  companyName: string;
  projectName: string;
  /** Interior or exterior — applies to every package on this sell sheet. */
  applicationType: SellSheetApplicationType | "";
  logoImage: string | null;
  tiers: SellSheetTier[];
};

export type SellSheetTierLabels = Record<SellSheetTierKey, string>;

/** Tier payload stored in the database (image fields are URLs). */
export type StoredSellSheetTier = SellSheetTier;

export type SellSheetRecord = {
  id: string;
  company_id: string;
  created_by: string | null;
  project_name: string | null;
  application_type: SellSheetApplicationType | null;
  logo_url: string | null;
  tiers: StoredSellSheetTier[];
  created_at: string;
  updated_at: string;
};
import type {
  CompanyPaintProductRole,
  PaintProductSource,
  QuoteTierName,
} from "@/types/database";

export const QUOTE_PAINT_TIERS = ["good", "better", "best"] as const;
export type QuotePaintTier = (typeof QUOTE_PAINT_TIERS)[number];

export function isQuotePaintTier(tier: string): tier is QuotePaintTier {
  return QUOTE_PAINT_TIERS.includes(tier as QuotePaintTier);
}

export function isPaintConfigComplete(
  config: Record<string, TierPaintConfigInput>,
): boolean {
  return Boolean(config.good?.topcoat_product_id);
}

export function isPaintConfigListComplete(
  configs: TierPaintConfigInput[] = [],
): boolean {
  const good = configs.find((row) => row.tier === "good");
  return Boolean(good?.topcoat_product_id);
}

export type TierPaintSummary = {
  tier: QuotePaintTier;
  primerName: string | null;
  topcoatName: string | null;
  primerCoats: number;
  topcoatCoats: number;
};

export type CompanyPaintProductRow = {
  id: string;
  company_id: string;
  source: PaintProductSource;
  paint_product_id: string | null;
  name: string;
  manufacturer_name: string | null;
  role: CompanyPaintProductRole;
  unit_cost: number;
  unit_price: number;
  coverage_sqft_per_gallon: number | null;
  application_type: string;
  sheen: string | null;
  is_self_priming: boolean;
  is_stain_blocking: boolean;
  is_mold_mildew_resistant: boolean;
  is_scrubbable: boolean;
  is_one_coat: boolean;
  paint_system_features: string[];
  paint_system_feature_options: string[];
  product_description: string | null;
  product_uses: string[];
  substrates: string[];
  recommended_uses: string[];
  base_type: string;
  voc_level: string;
  volume_solids_pct: number | null;
  volume_solids_label: string | null;
  sheen_options: string[];
  source_url: string | null;
  gallons_per_labor_hour: number | null;
  resin_type: string | null;
  resin_system: string | null;
  can_image_url: string | null;
  can_image_storage_path: string | null;
  /** Platform or company row `updated_at` — used to bust can image cache after re-upload. */
  can_image_updated_at: string | null;
  catalog_origin: string | null;
  catalog_review_status: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CompanyPaintPresetRow = {
  id: string;
  company_id: string;
  name: string;
  application_type: string;
  description: string | null;
  primer_product_id: string | null;
  topcoat_product_id: string | null;
  primer_coats: number;
  topcoat_coats: number;
  labor_hours_delta_pct: number;
  labor_hours_delta_hours: number;
  prep_hours_delta: number;
  value_add_features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TierPaintConfigInput = {
  tier: QuotePaintTier;
  primer_product_id: string | null;
  topcoat_product_id: string | null;
  primer_coats: number;
  topcoat_coats: number;
  primer_spot_prime: boolean;
  labor_hours_delta_pct: number;
  labor_hours_delta_hours: number;
  prep_hours_delta: number;
  value_add_features: string[];
};

export type ResolvedTierPaintConfig = TierPaintConfigInput & {
  primer: CompanyPaintProductRow | null;
  topcoat: CompanyPaintProductRow | null;
};

export function emptyTierPaintConfig(tier: QuotePaintTier): TierPaintConfigInput {
  return {
    tier,
    primer_product_id: null,
    topcoat_product_id: null,
    primer_coats: 1,
    topcoat_coats: 2,
    primer_spot_prime: false,
    labor_hours_delta_pct: 0,
    labor_hours_delta_hours: 0,
    prep_hours_delta: 0,
    value_add_features: [],
  };
}

export function defaultTierPaintState(): Record<
  QuotePaintTier,
  TierPaintConfigInput
> {
  return {
    good: emptyTierPaintConfig("good"),
    better: emptyTierPaintConfig("better"),
    best: emptyTierPaintConfig("best"),
  };
}

export function resolveTierPaintConfig(
  config: TierPaintConfigInput,
  productsById: Map<string, CompanyPaintProductRow>,
): ResolvedTierPaintConfig {
  const topcoat = config.topcoat_product_id
    ? productsById.get(config.topcoat_product_id) ?? null
    : null;
  const skipPrimer = topcoat?.is_self_priming;
  const primer =
    !skipPrimer && config.primer_product_id
      ? productsById.get(config.primer_product_id) ?? null
      : null;

  return { ...config, primer, topcoat };
}

export const ROLE_LABELS: Record<CompanyPaintProductRole, string> = {
  primer: "Primer",
  topcoat: "Topcoat",
  sealer: "Sealer",
  undercoater: "Undercoater",
};
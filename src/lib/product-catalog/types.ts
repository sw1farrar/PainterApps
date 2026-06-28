export type PaintProductApplication = "interior" | "exterior" | "both";

export const PAINT_PRODUCT_APPLICATIONS = [
  "interior",
  "exterior",
  "both",
] as const satisfies readonly PaintProductApplication[];
export type PaintProductCategory =
  | "paint"
  | "primer"
  | "sealer"
  | "undercoater";
export type PaintProductBase = "water" | "oil" | "solvent" | "unknown";

export type PaintResinSystem =
  | "acrylic"
  | "100_percent_acrylic"
  | "vinyl_acrylic"
  | "alkyd"
  | "alkyd_modified"
  | "urethane_modified_acrylic"
  | "urethane_alkyd"
  | "polyurethane"
  | "epoxy"
  | "silicone"
  | "latex"
  | "oil"
  | "unknown";

export type PaintSheen =
  | "ultra_flat"
  | "flat"
  | "matte"
  | "eggshell"
  | "satin"
  | "pearl"
  | "semi_gloss"
  | "gloss"
  | "high_gloss"
  | "soft_gloss"
  | "low_sheen";

export type PaintProductUse =
  | "walls"
  | "ceilings"
  | "trim"
  | "doors"
  | "cabinets"
  | "furniture"
  | "masonry"
  | "stucco"
  | "siding"
  | "decks"
  | "floors"
  | "metal"
  | "concrete"
  | "multi_surface";

export type PaintSubstrate =
  | "drywall"
  | "plaster"
  | "wood"
  | "hardboard"
  | "mdf"
  | "metal"
  | "galvanized_metal"
  | "masonry"
  | "brick"
  | "concrete"
  | "stucco"
  | "previously_painted"
  | "vinyl_siding"
  | "fiber_cement"
  | "cabinets";

export type PaintVocLevel = "zero" | "low" | "standard" | "unknown";

export type PaintManufacturerRow = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  official_domains: string[];
  aliases: string[];
  logo_url: string | null;
  logo_storage_path: string | null;
  created_at: string;
  updated_at: string;
};

export type PaintProductEnrichmentStatus = "pending" | "partial" | "complete";
export type PaintEnrichmentProposalStatus = "pending" | "accepted" | "declined";

export type PaintProductRow = {
  id: string;
  manufacturer_id: string;
  name: string;
  application_type: PaintProductApplication;
  category: PaintProductCategory;
  resin_type: string | null;
  resin_system: PaintResinSystem;
  base_type: PaintProductBase;
  sheens: PaintSheen[];
  product_uses: PaintProductUse[];
  substrates: PaintSubstrate[];
  voc_level: PaintVocLevel;
  is_self_priming: boolean;
  is_stain_blocking: boolean;
  is_mold_mildew_resistant: boolean;
  is_scrubbable: boolean;
  is_one_coat: boolean;
  recommended_uses: string[];
  volume_solids_pct: number | null;
  volume_solids_label: string | null;
  attribute_source_url: string | null;
  source_url: string | null;
  can_image_url: string | null;
  can_image_storage_path: string | null;
  product_description: string | null;
  sheen_options: string[];
  paint_system_features: string[];
  paint_system_feature_options: string[];
  enrichment_status: PaintProductEnrichmentStatus;
  enriched_at: string | null;
  enrichment_source_url: string | null;
  is_discontinued: boolean;
  discovered_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StoredCanImageCandidate = {
  image_url: string;
  storage_path: string;
  source_url: string | null;
  verified: boolean;
  source_scope?: "manufacturer" | "external";
  source_host?: string | null;
  /** Index in the discovery batch used to build this proposal (stable after partial uploads). */
  discovery_index?: number;
  /** Original remote image URL before proposal storage upload. */
  discovery_image_url?: string;
  /** Strict xAI label verification passed when this candidate was auto-selected. */
  strict_label_verified?: boolean;
  /** Bulk auto-enrich: permissive vision confirmed this candidate. */
  bulk_auto_verified?: boolean;
};

export type StoredManufacturerLogoCandidate = {
  image_url: string;
  storage_path: string;
  source_url: string | null;
  source_scope: "website" | "web";
  source_host: string | null;
};

export type StoredEnrichmentProposalPayload = {
  application_type?: PaintProductApplication;
  resin_type?: string | null;
  resin_system?: PaintResinSystem;
  base_type?: PaintProductBase;
  data_sheet_url?: string | null;
  data_sheet_title?: string | null;
  /** HTML manufacturer product page used for on-page can image scrape. */
  product_page_url?: string | null;
  source_url?: string | null;
  enrichment_source_url?: string | null;
  attribute_source_url?: string | null;
  product_description?: string | null;
  sheen_options?: string[];
  sheens?: PaintSheen[];
  product_uses?: PaintProductUse[];
  substrates?: PaintSubstrate[];
  voc_level?: PaintVocLevel;
  is_self_priming?: boolean;
  is_stain_blocking?: boolean;
  is_mold_mildew_resistant?: boolean;
  is_scrubbable?: boolean;
  is_one_coat?: boolean;
  recommended_uses?: string[];
  volume_solids_pct?: number | null;
  volume_solids_label?: string | null;
  paint_system_features?: string[];
  paint_system_feature_options?: string[];
  can_image_candidates?: StoredCanImageCandidate[];
  /** Set only when strict label verification passed; omit to leave can image blank. */
  selected_can_image_index?: number | null;
  /** Bulk auto-enrich: can already uploaded to product path during proposal creation. */
  preapplied_can_image_url?: string | null;
  preapplied_can_image_storage_path?: string | null;
};

export type PaintProductEnrichmentProposalRow = {
  id: string;
  product_id: string;
  status: PaintEnrichmentProposalStatus;
  proposed: StoredEnrichmentProposalPayload;
  previous_snapshot: StoredEnrichmentProposalPayload;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type ManufacturerMatch = {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  officialDomains: string[];
  matchScore: number;
  matchReason: string;
};

export type DiscoveredPaintCanImageCandidate = {
  imageUrl: string;
  sourceUrl: string | null;
  verified: boolean;
  /** Present server-side only; stripped before sending to client components. */
  buffer?: Buffer;
  mime: string;
  sourceScope: "manufacturer" | "external";
  sourceHost: string | null;
};

export type DiscoveredPaintProduct = {
  key: string;
  name: string;
  applicationType: PaintProductApplication;
  category: PaintProductCategory;
  resinType: string | null;
  resinSystem: PaintResinSystem;
  baseType: PaintProductBase;
  sheenOptions: string[];
  sheens: PaintSheen[];
  productUses: PaintProductUse[];
  substrates: PaintSubstrate[];
  vocLevel: PaintVocLevel;
  isSelfPriming: boolean;
  isStainBlocking: boolean;
  isMoldMildewResistant: boolean;
  isScrubbable: boolean;
  isOneCoat: boolean;
  recommendedUses: string[];
  volumeSolidsPct: number | null;
  volumeSolidsLabel: string | null;
  sourceUrl: string | null;
  attributeSourceUrl: string | null;
  productDescription?: string | null;
  paintSystemFeatures?: string[];
  paintSystemFeatureOptions?: string[];
  enrichmentSourceUrl?: string | null;
  canImageCandidates?: DiscoveredPaintCanImageCandidate[];
  manufacturerName?: string;
};

export type ManufacturerDiscoveryPhase = "national" | "regional" | "distributor";

export type DiscoveredPaintManufacturer = {
  key: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  officialDomains: string[];
  aliases: string[];
  distributionChannel: string | null;
  notes: string | null;
};

export function paintProductKey(product: {
  name: string;
  applicationType: PaintProductApplication;
  category: PaintProductCategory;
}): string {
  return `${product.applicationType}:${product.category}:${product.name.trim().toLowerCase()}`;
}

export type CatalogProductRow = PaintProductRow & {
  manufacturer_name: string;
  manufacturer_logo_url: string | null;
};

export function toCatalogProductRow(
  product: PaintProductRow,
  manufacturer: Pick<PaintManufacturerRow, "name" | "logo_url">,
): CatalogProductRow {
  return {
    ...product,
    manufacturer_name: manufacturer.name,
    manufacturer_logo_url: manufacturer.logo_url ?? null,
  };
}

export type ProductCatalogActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
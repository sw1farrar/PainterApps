export type UserRole =
  | "admin"
  | "project_manager"
  | "job_superintendent"
  | "painter"
  | "finance";

export type CompanyFeature =
  | "free_tools_sell_sheets"
  | "quotes"
  | "customers"
  | "jobs"
  | "team"
  | "reports"
  | "billing";

export type XaiModelTier = "premium" | "economy";

export type SiteSettings = {
  id: number;
  xai_model_tier: XaiModelTier;
  updated_at: string;
  updated_by: string | null;
};

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";
export type QuoteTierName = "good" | "better" | "best" | "beautiful";
export type LineItemType = "labor" | "material" | "extra";

export type Company = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  tax_rate: number;
  labor_rates: Record<string, number>;
  material_markup: number;
  overhead_pct: number;
  default_margins: Record<string, number>;
  coverage_sqft_per_gallon: number;
  onboarding_complete: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string;
  sell_sheet_benefit_library: unknown;
  sell_sheet_paint_system_library: string[];
  enabled_features: CompanyFeature[];
  created_at: string;
};

export type Profile = {
  id: string;
  company_id: string | null;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  is_site_admin: boolean;
  created_at: string;
};

export type Customer = {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  portal_token: string;
  created_at: string;
};

export type Quote = {
  id: string;
  company_id: string;
  customer_id: string;
  job_address: string;
  job_address_line2: string | null;
  job_city: string | null;
  job_state: string | null;
  job_zip: string | null;
  status: QuoteStatus;
  before_photos: string[];
  accepted_tier: QuoteTierName | null;
  created_at: string;
  updated_at: string;
};

export type QuoteRoom = {
  id: string;
  quote_id: string;
  name: string;
  surface_type: string;
  condition: string;
  sq_ft: number;
  color_codes: string;
  coats: number;
  prep_work: string;
};

export type QuoteLineItem = {
  id: string;
  quote_id: string;
  type: LineItemType;
  description: string;
  qty: number;
  unit_cost: number;
  markup: number;
};

export type QuoteTier = {
  id: string;
  quote_id: string;
  tier: QuoteTierName;
  price: number;
  margin: number;
  features: string[];
  benefits: string[];
};

export type QuoteUpgradeRules = {
  id: string;
  company_id: string;
  per_gallon_premium: number;
  premium_service_fee: number;
  tier_multipliers: Record<QuoteTierName, number>;
};

export type JobChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type Job = {
  id: string;
  company_id: string;
  quote_id: string;
  customer_id: string;
  tier: QuoteTierName;
  status: string;
  selling_price: number;
  job_photos: string[];
  notes: string | null;
  checklist: JobChecklistItem[];
  created_at: string;
};

export type SellSheet = {
  id: string;
  company_id: string;
  created_by: string | null;
  project_name: string | null;
  application_type: import("@/types/sell-sheet").SellSheetApplicationType | null;
  logo_url: string | null;
  tiers: import("@/types/sell-sheet").StoredSellSheetTier[];
  created_at: string;
  updated_at: string;
};

export type PaintProductApplication = "interior" | "exterior" | "both";
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

export type PaintManufacturer = {
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

export type PaintProduct = {
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

export type PaintProductEnrichmentProposal = {
  id: string;
  product_id: string;
  status: PaintEnrichmentProposalStatus;
  proposed: Record<string, unknown>;
  previous_snapshot: Record<string, unknown>;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  company_id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type TeamInvite = {
  id: string;
  company_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

type InsertOf<T, Optional extends keyof T = never> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: InsertOf<Company, "id" | "created_at" | "logo_url" | "address" | "address_line2" | "city" | "state" | "zip" | "phone" | "email" | "tax_rate" | "labor_rates" | "material_markup" | "overhead_pct" | "default_margins" | "coverage_sqft_per_gallon" | "onboarding_complete" | "stripe_customer_id" | "stripe_subscription_id" | "subscription_status" | "sell_sheet_benefit_library" | "sell_sheet_paint_system_library" | "enabled_features">;
        Update: Partial<Company>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: InsertOf<Profile, "company_id" | "role" | "full_name" | "avatar_url" | "is_site_admin" | "created_at">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      customers: {
        Row: Customer;
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          notes?: string | null;
          portal_token?: string;
          created_at?: string;
        };
        Update: Partial<Customer>;
        Relationships: [];
      };
      quotes: {
        Row: Quote;
        Insert: InsertOf<Quote, "id" | "status" | "before_photos" | "accepted_tier" | "job_address_line2" | "job_city" | "job_state" | "job_zip" | "created_at" | "updated_at">;
        Update: Partial<Quote>;
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_rooms: {
        Row: QuoteRoom;
        Insert: InsertOf<QuoteRoom, "id" | "surface_type" | "condition" | "sq_ft" | "color_codes" | "coats" | "prep_work">;
        Update: Partial<QuoteRoom>;
        Relationships: [];
      };
      quote_line_items: {
        Row: QuoteLineItem;
        Insert: InsertOf<QuoteLineItem, "id" | "qty" | "unit_cost" | "markup">;
        Update: Partial<QuoteLineItem>;
        Relationships: [];
      };
      quote_tiers: {
        Row: QuoteTier;
        Insert: InsertOf<QuoteTier, "id" | "price" | "margin" | "features" | "benefits">;
        Update: Partial<QuoteTier>;
        Relationships: [
          {
            foreignKeyName: "quote_tiers_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_upgrade_rules: {
        Row: QuoteUpgradeRules;
        Insert: InsertOf<QuoteUpgradeRules, "id" | "per_gallon_premium" | "premium_service_fee" | "tier_multipliers">;
        Update: Partial<QuoteUpgradeRules>;
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: InsertOf<Job, "id" | "status" | "selling_price" | "job_photos" | "notes" | "checklist" | "created_at">;
        Update: Partial<Job>;
        Relationships: [];
      };
      sell_sheets: {
        Row: SellSheet;
        Insert: InsertOf<SellSheet, "id" | "created_by" | "project_name" | "logo_url" | "tiers" | "created_at" | "updated_at">;
        Update: Partial<SellSheet>;
        Relationships: [];
      };
      paint_manufacturers: {
        Row: PaintManufacturer;
        Insert: InsertOf<PaintManufacturer, "id" | "website_url" | "official_domains" | "aliases" | "logo_url" | "logo_storage_path" | "created_at" | "updated_at">;
        Update: Partial<PaintManufacturer>;
        Relationships: [];
      };
      paint_products: {
        Row: PaintProduct;
        Insert: InsertOf<PaintProduct, "id" | "resin_type" | "base_type" | "source_url" | "can_image_url" | "can_image_storage_path" | "product_description" | "sheen_options" | "paint_system_features" | "paint_system_feature_options" | "enrichment_status" | "enriched_at" | "enrichment_source_url" | "is_discontinued" | "discovered_at" | "created_by" | "created_at" | "updated_at">;
        Update: Partial<PaintProduct>;
        Relationships: [
          {
            foreignKeyName: "paint_products_manufacturer_id_fkey";
            columns: ["manufacturer_id"];
            isOneToOne: false;
            referencedRelation: "paint_manufacturers";
            referencedColumns: ["id"];
          },
        ];
      };
      paint_product_enrichment_proposals: {
        Row: PaintProductEnrichmentProposal;
        Insert: InsertOf<PaintProductEnrichmentProposal, "id" | "status" | "created_by" | "reviewed_by" | "reviewed_at" | "created_at">;
        Update: Partial<PaintProductEnrichmentProposal>;
        Relationships: [
          {
            foreignKeyName: "paint_product_enrichment_proposals_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "paint_products";
            referencedColumns: ["id"];
          },
        ];
      };
      team_invites: {
        Row: TeamInvite;
        Insert: InsertOf<TeamInvite, "id" | "token" | "invited_by" | "expires_at" | "accepted_at" | "created_at">;
        Update: Partial<TeamInvite>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: InsertOf<Notification, "id" | "body" | "href" | "read_at" | "created_at">;
        Update: Partial<Notification>;
        Relationships: [];
      };
      site_settings: {
        Row: SiteSettings;
        Insert: InsertOf<SiteSettings, "updated_at" | "updated_by">;
        Update: Partial<SiteSettings>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ensure_profile: {
        Args: Record<string, never>;
        Returns: Profile;
      };
    };
    Enums: {
      xai_model_tier: XaiModelTier;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
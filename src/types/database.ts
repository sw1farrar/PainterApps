export type UserRole =
  | "admin"
  | "project_manager"
  | "job_superintendent"
  | "painter"
  | "finance";

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";
export type QuoteTierName = "good" | "better" | "best" | "beautiful";
export type LineItemType = "labor" | "material" | "extra";

export type Company = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
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
  created_at: string;
};

export type Profile = {
  id: string;
  company_id: string | null;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  portal_token: string;
  created_at: string;
};

export type Quote = {
  id: string;
  company_id: string;
  customer_id: string;
  job_address: string;
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
        Insert: InsertOf<Company, "id" | "created_at" | "logo_url" | "address" | "phone" | "email" | "tax_rate" | "labor_rates" | "material_markup" | "overhead_pct" | "default_margins" | "coverage_sqft_per_gallon" | "onboarding_complete" | "stripe_customer_id" | "stripe_subscription_id" | "subscription_status">;
        Update: Partial<Company>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: InsertOf<Profile, "company_id" | "role" | "full_name" | "avatar_url" | "created_at">;
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
          portal_token?: string;
          created_at?: string;
        };
        Update: Partial<Customer>;
        Relationships: [];
      };
      quotes: {
        Row: Quote;
        Insert: InsertOf<Quote, "id" | "status" | "before_photos" | "accepted_tier" | "created_at" | "updated_at">;
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
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
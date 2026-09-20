export type LetterSurface = {
  id: string;
  rate_id: string | null;
  label: string;
  unit: string;
  qty: number;
  coats: number;
  rate: number;
  hours_paint: number;
  hours_prep: number;
  gallons: number;
  amount: number;
};

export type LetterArea = {
  id: string;
  name: string;
  kind: string;
  length: number;
  width: number;
  height: number;
  opening_sqft: number;
  estimate_surfaces: LetterSurface[] | null;
};

export type LetterCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  zip: string;
};

export type LetterEstimate = {
  id: string;
  number: number;
  status: string;
  zip: string;
  hourly_rate_snapshot: number;
  totals: { hours?: number; labor?: number; material?: number; total?: number } | null;
  notes: string;
  created_at: string;
  view_token?: string;
};

export type LetterCompany = {
  company_name: string;
  legal_name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logo_url: string;
  license_number: string;
  insurance_line: string;
  accent_color: string;
  proposal_valid_days: number;
  payment_terms: string;
  exclusions: string;
};

export const DEFAULT_PAYMENT_TERMS =
  "50% to schedule, balance due on completion.";

export const DEFAULT_EXCLUSIONS =
  "Price assumes surfaces are sound and ready for paint. Does not include repairs, drywall, carpentry, mold/mildew remediation, or lead/asbestos work unless written above. Colors and sheen per owner approval. Weather and access may change schedule. Change orders billed separately.";

export const DEFAULT_ACCENT = "#0f766e";

export function displayWebsite(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function normalizeWebsite(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validThrough(createdAt: string, days: number) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + Math.max(1, days || 30));
  return d;
}

export function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatLetterDate(iso: string | Date) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function companyFromRow(row: {
  name?: string | null;
  company_name?: string | null;
  legal_name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  logo_url?: string | null;
  license_number?: string | null;
  insurance_line?: string | null;
  accent_color?: string | null;
  proposal_valid_days?: number | null;
  payment_terms?: string | null;
  exclusions?: string | null;
}): LetterCompany {
  return {
    company_name: row.name ?? row.company_name ?? "",
    legal_name: row.legal_name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    website: row.website ?? "",
    address: row.address ?? "",
    logo_url: row.logo_url ?? "",
    license_number: row.license_number ?? "",
    insurance_line: row.insurance_line ?? "",
    accent_color: row.accent_color || DEFAULT_ACCENT,
    proposal_valid_days: Number(row.proposal_valid_days ?? 30) || 30,
    payment_terms: row.payment_terms || DEFAULT_PAYMENT_TERMS,
    exclusions: row.exclusions || DEFAULT_EXCLUSIONS,
  };
}

export function emptyLetterCompany(): LetterCompany {
  return {
    company_name: "",
    legal_name: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    logo_url: "",
    license_number: "",
    insurance_line: "",
    accent_color: DEFAULT_ACCENT,
    proposal_valid_days: 30,
    payment_terms: DEFAULT_PAYMENT_TERMS,
    exclusions: DEFAULT_EXCLUSIONS,
  };
}

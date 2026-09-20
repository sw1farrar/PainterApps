export type Substrate =
  | "drywall"
  | "wood"
  | "masonry"
  | "stucco"
  | "metal"
  | "previously-painted"
  | "concrete-floor";

export const SUBSTRATES: Substrate[] = [
  "drywall",
  "wood",
  "masonry",
  "stucco",
  "metal",
  "previously-painted",
  "concrete-floor",
];

export type FailureMode =
  | "peeling"
  | "chalking"
  | "tannin"
  | "efflorescence"
  | "rust"
  | "none";

export type Sheen = "flat" | "eggshell" | "satin" | "semi-gloss" | "gloss";

export const SHEENS: Sheen[] = [
  "flat",
  "eggshell",
  "satin",
  "semi-gloss",
  "gloss",
];

export type Traffic = "low" | "medium" | "high" | "exterior-exposed";

/** Architectural / specialty coating use — not the same as substrate. */
export type ApplicationType =
  | "walls"
  | "ceilings"
  | "trim"
  | "siding"
  | "floors"
  | "wood-deck"
  | "parking-deck"
  | "plaza-balcony"
  | "roof"
  | "below-grade"
  | "pool"
  | "fountain"
  | "masonry-waterproofing"
  | "metal";

export const APPLICATION_TYPES: ApplicationType[] = [
  "walls",
  "ceilings",
  "trim",
  "siding",
  "floors",
  "wood-deck",
  "parking-deck",
  "plaza-balcony",
  "roof",
  "below-grade",
  "pool",
  "fountain",
  "masonry-waterproofing",
  "metal",
];

export type ProductKind = "prep" | "primer" | "topcoat" | "other";

export const PRODUCT_KINDS: ProductKind[] = [
  "prep",
  "primer",
  "topcoat",
  "other",
];

export type Manufacturer = {
  id: string;
  slug: string;
  name: string;
  website: string;
};

export type TdsProduct = {
  id: string;
  manufacturerId: string;
  name: string;
  sku: string;
  kind: ProductKind;
  substrates: Substrate[];
  interior: boolean;
  exterior: boolean;
  vocGL: number;
  sheens: Sheen[];
  minTempF: number;
  maxTempF: number;
  maxHumidityPct: number;
  minDewSpreadF?: number;
  rainReadyMinutes?: number;
  recoatHours?: number;
  tdsUrl: string;
  tdsRevision: string;
  tdsDate: string;
  notes: string;
  attrs?: Record<string, unknown>;
  specs?: Record<string, unknown>;
  documents?: Array<{
    id: string;
    kind: string;
    title: string;
    publicUrl: string | null;
    revision: string;
    stored?: boolean;
  }>;
};

export type TdsSystem = {
  id: string;
  manufacturerId: string;
  name: string;
  interior: boolean;
  exterior: boolean;
  substrates: Substrate[];
  applicationTypes?: ApplicationType[];
  failureModes: FailureMode[];
  prepNotes: string;
  primerProductId: string;
  topcoatProductId: string;
  midcoatProductId?: string;
  why: string;
  rankHint: number;
  attrs?: Record<string, unknown>;
};

export type MatchQuery = {
  interior?: boolean;
  exterior?: boolean;
  substrate?: Substrate;
  substrates?: Substrate[];
  applicationType?: ApplicationType;
  applicationTypes?: ApplicationType[];
  failureMode?: FailureMode;
  sheen?: Sheen;
  sheens?: Sheen[];
  traffic?: Traffic;
  vocSensitive?: boolean;
  manufacturerId?: string;
  manufacturerIds?: string[];
  tempF?: number;
  humidity?: number;
  rainWithinHours?: number;
};

export type MatchedSystem = {
  system: TdsSystem;
  manufacturer: Manufacturer;
  primer: TdsProduct;
  topcoat: TdsProduct;
  midcoat?: TdsProduct;
  score: number;
  reasons: string[];
};

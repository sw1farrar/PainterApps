export type Substrate =
  | "drywall"
  | "wood"
  | "masonry"
  | "stucco"
  | "metal"
  | "previously-painted"
  | "concrete-floor";

export type FailureMode =
  | "peeling"
  | "chalking"
  | "tannin"
  | "efflorescence"
  | "rust"
  | "none";

export type Sheen = "flat" | "eggshell" | "satin" | "semi-gloss" | "gloss";

export type Traffic = "low" | "medium" | "high" | "exterior-exposed";

export type ProductKind = "prep" | "primer" | "topcoat" | "other";

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
};

export type TdsSystem = {
  id: string;
  manufacturerId: string;
  name: string;
  interior: boolean;
  exterior: boolean;
  substrates: Substrate[];
  failureModes: FailureMode[];
  prepNotes: string;
  primerProductId: string;
  topcoatProductId: string;
  midcoatProductId?: string;
  why: string;
  rankHint: number;
};

export type MatchQuery = {
  interior: boolean;
  exterior: boolean;
  substrate: Substrate;
  failureMode?: FailureMode;
  sheen?: Sheen;
  traffic?: Traffic;
  vocSensitive?: boolean;
  manufacturerId?: string;
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

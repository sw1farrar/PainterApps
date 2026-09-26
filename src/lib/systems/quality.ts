import type { TdsProduct } from "@/lib/systems/types";

/**
 * Quality index, 0.0–10.0, one decimal, 10 best.
 *
 * A product is scored only against its application: exterior finishes,
 * interior finishes, trim enamels, floor coatings, or primers. Volume solids
 * use a curve for that class, because a 32% bonding primer is not a thin
 * house paint and a 30% urethane enamel is not a cheap wall coating.
 *
 * Resin adjusts the film. Features then add the published performance that
 * actually separates peers. Boilerplate shared by a whole line (mildew,
 * self-priming, VinylSafe, “down to 35°F”) does not move the rank.
 * A distinctive feature set can pass a small solids gap — about two or three
 * points — and cannot pass a large one. Manufacturer id is never an input.
 */

export type QualityClaimId =
  | "best"
  | "lifetime"
  | "warranty"
  | "crosslink"
  | "oneCoat"
  | "burnish"
  | "wash"
  | "stain"
  | "moisture"
  | "earlyMoisture"
  | "dirt"
  | "hide"
  | "colorRetention"
  | "technology"
  | "adhesion"
  | "wideWindow"
  | "leveling"
  | "lowTemp"
  | "contractorLine"
  | "extender";

export type QualityResinId =
  | "acrylic100"
  | "acrylic"
  | "urethaneAcrylic"
  | "urethaneAlkyd"
  | "styreneAcrylic"
  | "vinylAcrylic"
  | "pva";

export type ApplicationClass =
  | "exterior-topcoat"
  | "interior-topcoat"
  | "trim"
  | "floor"
  | "primer"
  | "other";

export const APPLICATION_CLASS_ORDER: ApplicationClass[] = [
  "exterior-topcoat",
  "interior-topcoat",
  "trim",
  "floor",
  "primer",
  "other",
];

export type QualityIndex = {
  /** Null when volume solids are not on file. */
  score: number | null;
  solidsPct: number | null;
  resin: QualityResinId | null;
  applicationClass: ApplicationClass;
  claims: Array<{ id: QualityClaimId; years?: number }>;
};

const FLOOR_RE = /\b(floor|porch|patio)\b/i;
const TRIM_RE = /\b(trim|enamel)\b/i;
const RANGE_RE = /(\d{2,3})\s*°?\s*f?\s*(?:to|–|-|through)\s*(\d{2,3})\s*°?\s*f/i;
const YEAR_WARRANTY = /(\d{1,2})\s*-?\s*year\s+warrant/i;

type Claim = { id: QualityClaimId; points: number; years?: number };

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function field(product: TdsProduct, key: string): number | null {
  return asNumber(product.specs?.[key] ?? product.attrs?.[key]);
}

function textBlob(product: TdsProduct): string {
  return [product.description, ...(product.features ?? []), ...(product.benefits ?? [])]
    .filter(Boolean)
    .join(" \n ");
}

function resinBlob(product: TdsProduct, copy: string): string {
  const specs = product.specs ?? {};
  return [specs.resin_type, specs.vehicle_type, product.attrs?.resin_type, product.attrs?.vehicle_type, copy]
    .filter((v) => v != null && String(v).trim())
    .join(" \n ")
    .toLowerCase();
}

export function resinClassFrom(text: string): QualityResinId | null {
  if (!text.trim()) return null;
  if (/vinyl\s*-?\s*acrylic/.test(text)) return "vinylAcrylic";
  if (/urethane/.test(text) && /alkyd/.test(text)) return "urethaneAlkyd";
  if (/urethane/.test(text) && /acrylic/.test(text)) return "urethaneAcrylic";
  if (/styrene/.test(text) && /acrylic/.test(text)) return "styreneAcrylic";
  if (/styrenated/.test(text)) return "styreneAcrylic";
  if (/\bpva\b|vinyl acetate/.test(text)) return "pva";
  if (/100\s*%|100\s*percent/.test(text) && /acrylic/.test(text)) return "acrylic100";
  if (/acrylic/.test(text)) return "acrylic";
  return null;
}

export function resinClass(product: TdsProduct): QualityResinId | null {
  return resinClassFrom(resinBlob(product, textBlob(product)));
}

export function applicationClass(product: TdsProduct): ApplicationClass {
  if (product.kind === "primer") return "primer";
  const name = product.name;
  const resin = resinClass(product);
  if (FLOOR_RE.test(name) || (product.substrates.length === 1 && product.substrates[0] === "concrete-floor")) {
    return "floor";
  }
  if (TRIM_RE.test(name) || resin === "urethaneAlkyd") return "trim";
  if (product.exterior && !product.interior) return "exterior-topcoat";
  if (product.interior && !product.exterior) return "interior-topcoat";
  if (/exterior/i.test(name)) return "exterior-topcoat";
  if (/interior/i.test(name)) return "interior-topcoat";
  if (product.exterior) return "exterior-topcoat";
  if (product.interior) return "interior-topcoat";
  return "other";
}

function solidsFor(vs: number, cls: ApplicationClass): number {
  if (cls === "primer") return clamp(2.2 + ((vs - 20) / 20) * 5, 0, 8.2);
  if (cls === "trim") return clamp(6.2 + ((vs - 28) / 12) * 2.2, 0, 9);
  if (cls === "floor") return clamp(3 + ((vs - 30) / 50) * 6, 0, 9.2);
  return clamp(2.6 + ((vs - 24) / 22) * 5.6, 0, 8.4);
}

function resinAdjust(resin: QualityResinId | null, cls: ApplicationClass): number {
  if (cls === "trim") {
    if (resin === "urethaneAlkyd") return 0.45;
    if (resin === "acrylic100" || resin === "acrylic" || resin === "urethaneAcrylic") return 0.25;
    if (resin === "vinylAcrylic") return -1;
    if (resin === "pva") return -1.6;
    return 0;
  }
  if (cls === "primer") {
    if (resin === "urethaneAcrylic") return 0.55;
    if (resin === "styreneAcrylic") return 0.35;
    if (resin === "acrylic100" || resin === "acrylic") return 0.3;
    if (resin === "vinylAcrylic") return -0.9;
    if (resin === "pva") return -1.4;
    return 0;
  }
  if (resin === "acrylic100" || resin === "acrylic") return 0.35;
  if (resin === "styreneAcrylic") return cls === "interior-topcoat" ? 0.3 : 0.05;
  if (resin === "urethaneAcrylic") return 0.3;
  if (resin === "vinylAcrylic") return -1.35;
  if (resin === "pva") return -2;
  return 0;
}

function windowTemps(product: TdsProduct, text: string) {
  let min = Number.isFinite(product.minTempF) ? product.minTempF : null;
  let max = Number.isFinite(product.maxTempF) ? product.maxTempF : null;
  const range = RANGE_RE.exec(text);
  if (range) {
    const lo = Math.min(Number(range[1]), Number(range[2]));
    const hi = Math.max(Number(range[1]), Number(range[2]));
    if (min == null || lo < min) min = lo;
    if (max == null || hi > max) max = hi;
  }
  return { min, max };
}

function add(claims: Claim[], id: QualityClaimId, points: number, years?: number) {
  if (!points) return;
  claims.push(years != null ? { id, points, years } : { id, points });
}

function featureCap(cls: ApplicationClass) {
  if (cls === "primer") return 2;
  if (cls === "trim") return 1.7;
  return 1.85;
}

/** Distinctive published performance. One level per idea, not a keyword pile. */
function featuresFor(product: TdsProduct, cls: ApplicationClass, text: string): Claim[] {
  const claims: Claim[] = [];
  const lower = text.toLowerCase();
  const has = (re: RegExp) => re.test(lower);

  if (has(/best[-\s]?in[-\s]?class/)) add(claims, "best", 0.9);
  else if (has(/lifetime warranty|limited lifetime/)) add(claims, "lifetime", 0.75);
  else {
    const years = YEAR_WARRANTY.exec(lower);
    if (years) add(claims, "warranty", Math.min(0.6, Number(years[1]) * 0.03), Number(years[1]));
  }

  if (has(/one[-\s]?coat|\b1[-\s]?coat\b/)) {
    add(claims, "oneCoat", cls === "primer" ? 0.15 : 0.45);
  }

  if (has(/cross-?\s?link|patented/)) add(claims, "crosslink", 0.55);
  else if (has(/permalast/)) add(claims, "technology", 0.45);
  else if (has(/advanced resin/)) add(claims, "technology", 0.18);

  if (has(/climateflex|exceptional early moisture|outstanding early moisture/)) {
    add(claims, "moisture", 0.8);
  } else if (has(/moisture[-\s]?resistant technology/)) {
    add(claims, "moisture", 0.5);
  } else if (has(/early moisture/)) {
    add(claims, "earlyMoisture", 0.22);
  }

  const temps = windowTemps(product, lower);
  if ((temps.max != null && temps.max >= 115) || /1[12]\d\s*°?\s*f/.test(lower)) {
    add(claims, "wideWindow", 0.6);
  } else if (temps.max != null && temps.max >= 100) {
    add(claims, "wideWindow", 0.12);
  }
  if (cls === "primer" && temps.min != null && temps.min <= 40) add(claims, "lowTemp", 0.3);

  if (has(/great dirt|excellent dirt|outstanding dirt/)) add(claims, "dirt", 0.22);
  else if (has(/dirt pick/)) add(claims, "dirt", has(/\bearly dirt/) ? 0.08 : 0.16);

  if (has(/outstanding hide|excellent hide|excellent [^.\n]{0,40}hiding|outstanding [^.\n]{0,24}hide/)) {
    add(claims, "hide", 0.16);
  } else if (has(/dependable hide|\bhide\b|\bhiding\b/)) {
    add(claims, "hide", 0.08);
  }

  if (has(/flow,?\s+and leveling|levels out|buttery smooth|silky/)) add(claims, "leveling", 0.2);

  if (has(/burnish/)) add(claims, "burnish", 0.3);
  if (has(/washab|scrubb/)) add(claims, "wash", 0.18);
  if (has(/stain[-\s]?resist|resistance to stains|most stains/)) add(claims, "stain", 0.18);
  if (has(/color retention|gloss retention/)) add(claims, "colorRetention", 0.28);

  const adhesion =
    has(/bonding primer|promotes adhesion|hard-to-paint|tightly bonds/) ||
    (has(/adhesion/) && has(/slick|glossy/));
  if (cls === "primer") {
    if (adhesion) add(claims, "adhesion", has(/promotes adhesion|tightly bonds|bonding primer|hard-to-paint/) ? 1.45 : 0.55);
    if (has(/stain-?\s?block|seals out|tannin|water stains/)) add(claims, "stain", 1.15);
  } else if (has(/\badhesion\b/)) {
    add(claims, "adhesion", 0.1);
  }

  if (has(/professional[-\s]?quality|contractor grade|builder(?:'s)? grade|economy paint|value line/)) {
    add(claims, "contractorLine", -0.4);
  }

  return claims;
}

function extenderPenalty(product: TdsProduct, resin: QualityResinId | null, vs: number): boolean {
  if (resin === "urethaneAlkyd") return false;
  const ws = field(product, "weight_solids_pct");
  if (ws == null || vs <= 0) return false;
  return ws / vs >= 1.62;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function liftFrom(claims: Claim[], cap: number) {
  let positive = 0;
  let negative = 0;
  for (const claim of claims) {
    if (claim.points > 0) positive += claim.points;
    else negative += claim.points;
  }
  return Math.min(positive, cap) + negative;
}

export function qualityIndex(product: TdsProduct): QualityIndex {
  const application = applicationClass(product);
  const solidsPct = field(product, "volume_solids_pct");
  const copy = textBlob(product);
  const resin = resinClassFrom(resinBlob(product, copy));
  if (solidsPct == null) {
    return { score: null, solidsPct: null, resin, applicationClass: application, claims: [] };
  }
  const claims = featuresFor(product, application, copy);
  if (extenderPenalty(product, resin, solidsPct)) {
    claims.push({ id: "extender", points: -0.35 });
  }
  const raw =
    solidsFor(solidsPct, application) +
    resinAdjust(resin, application) +
    liftFrom(claims, featureCap(application));
  const shown = claims
    .filter((claim) => Math.abs(claim.points) >= 0.15 || claim.points < 0)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .map(({ id, years }) => (years != null ? { id, years } : { id }));
  return {
    score: round1(clamp(raw, 0, 10)),
    solidsPct,
    resin,
    applicationClass: application,
    claims: shown,
  };
}

/** Read-only quality block for MCP. Not a stored column. */
export function qualityMcp(product: TdsProduct) {
  const index = qualityIndex(product);
  return {
    score: index.score,
    application_class: index.applicationClass,
    resin: index.resin,
    solids_pct: index.solidsPct,
    claims: index.claims,
  };
}

/** Like applications stay together. Within a class, highest quality is first. */
export function compareByQuality(a: TdsProduct, b: TdsProduct): number {
  const qa = qualityIndex(a);
  const qb = qualityIndex(b);
  const order =
    APPLICATION_CLASS_ORDER.indexOf(qa.applicationClass) -
    APPLICATION_CLASS_ORDER.indexOf(qb.applicationClass);
  if (order) return order;
  if (qa.score == null && qb.score == null) return a.name.localeCompare(b.name);
  if (qa.score == null) return 1;
  if (qb.score == null) return -1;
  if (qa.score !== qb.score) return qb.score - qa.score;
  return a.name.localeCompare(b.name);
}

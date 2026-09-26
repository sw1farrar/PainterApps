import type { TdsProduct } from "@/lib/systems/types";

/**
 * Products are grouped by the job they do. The 0–10 score is stored on the
 * product after research. This module does not invent a rank from solids or
 * marketing lines.
 */

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

const FLOOR_RE = /\b(floor|porch|patio)\b/i;
const TRIM_RE = /\b(trim|enamel)\b/i;

function copyBlob(product: TdsProduct): string {
  const specs = product.specs ?? {};
  return [
    specs.resin_type,
    specs.vehicle_type,
    product.attrs?.resin_type,
    product.attrs?.vehicle_type,
    product.description,
    ...(product.features ?? []),
    ...(product.benefits ?? []),
  ]
    .filter((value) => value != null && String(value).trim())
    .join(" \n ")
    .toLowerCase();
}

function isUrethaneAlkyd(product: TdsProduct) {
  const text = copyBlob(product);
  return /urethane/.test(text) && /alkyd/.test(text);
}

export function applicationClass(product: TdsProduct): ApplicationClass {
  if (product.kind === "primer") return "primer";
  const name = product.name;
  if (
    FLOOR_RE.test(name) ||
    (product.substrates.length === 1 && product.substrates[0] === "concrete-floor")
  ) {
    return "floor";
  }
  if (TRIM_RE.test(name) || isUrethaneAlkyd(product)) return "trim";
  if (product.exterior && !product.interior) return "exterior-topcoat";
  if (product.interior && !product.exterior) return "interior-topcoat";
  if (/exterior/i.test(name)) return "exterior-topcoat";
  if (/interior/i.test(name)) return "interior-topcoat";
  if (product.exterior) return "exterior-topcoat";
  if (product.interior) return "interior-topcoat";
  return "other";
}

export function volumeSolidsPct(product: TdsProduct): number | null {
  const raw = product.specs?.volume_solids_pct ?? product.attrs?.volume_solids_pct;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function resinName(product: TdsProduct): string | null {
  const raw = product.specs?.resin_type ?? product.specs?.vehicle_type;
  if (typeof raw !== "string") return null;
  const name = raw.trim();
  return name || null;
}

export function storedScore(product: TdsProduct): number | null {
  const n = product.qualityScore;
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

/** Read-only quality block for MCP. The score is whatever research stored. */
export function qualityMcp(product: TdsProduct) {
  return {
    score: storedScore(product),
    summary: product.qualitySummary?.trim() || null,
    application_class: applicationClass(product),
    resin: resinName(product),
    solids_pct: volumeSolidsPct(product),
  };
}

/** Like applications stay together. Within a class, the stored score leads. */
export function compareByQuality(a: TdsProduct, b: TdsProduct): number {
  const order =
    APPLICATION_CLASS_ORDER.indexOf(applicationClass(a)) -
    APPLICATION_CLASS_ORDER.indexOf(applicationClass(b));
  if (order) return order;
  const qa = storedScore(a);
  const qb = storedScore(b);
  if (qa == null && qb == null) return a.name.localeCompare(b.name);
  if (qa == null) return 1;
  if (qb == null) return -1;
  if (qa !== qb) return qb - qa;
  return a.name.localeCompare(b.name);
}

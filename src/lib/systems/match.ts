import { CORPUS_CATALOG, type Catalog } from "@/lib/systems/corpus-catalog";
import type {
  ApplicationType,
  CoatRole,
  Manufacturer,
  MatchQuery,
  MatchedSystem,
  TdsProduct,
  TdsSystem,
} from "./types";

function productById(id: string, catalog: Catalog): TdsProduct | undefined {
  return catalog.products.find((p) => p.id === id);
}

function manufacturerById(id: string, catalog: Catalog) {
  return catalog.manufacturers.find((m) => m.id === id);
}

function overlap<T>(have: T[] | undefined, want: T[]) {
  if (!want.length) return true;
  const set = new Set(have ?? []);
  return want.some((v) => set.has(v));
}

function listOf<T>(many: T[] | undefined, one: T | undefined): T[] {
  if (many?.length) return many;
  return one != null ? [one] : [];
}

const FLOOR_RE = /porch|patio|floor/i;
const DECK_RE = /deck/i;
const PARKING_RE = /parking/i;
const ROOF_RE = /\broof/i;
const POOL_RE = /\bpool/i;
const FOUNTAIN_RE = /fountain/i;
const BELOW_GRADE_RE = /below[\s-]?grade/i;
const PLAZA_RE = /plaza|balcon/i;
const WATERPROOF_RE = /waterproof/i;
const DTM_RE = /dtm|d\.t\.m|direct[\s-]?to[\s-]?metal/i;
const TRIM_RE = /trim|enamel/i;
const CEILING_RE = /ceiling/i;
const SIDING_RE = /siding/i;

/**
 * Application tags for a product. Specialty uses (parking decks, roofs,
 * pools, …) come from the name only — never invented from a generic
 * substrate list.
 */
export function applicationTypesFor(product: TdsProduct): ApplicationType[] {
  const name = product.name;
  const subs = new Set(product.substrates);
  const tags = new Set<ApplicationType>();
  const namedFloor =
    FLOOR_RE.test(name) || (DECK_RE.test(name) && !PARKING_RE.test(name));

  if (subs.has("concrete-floor") || namedFloor) tags.add("floors");
  if (namedFloor) tags.add("wood-deck");
  if (PARKING_RE.test(name)) tags.add("parking-deck");
  if (ROOF_RE.test(name)) tags.add("roof");
  if (POOL_RE.test(name)) tags.add("pool");
  if (FOUNTAIN_RE.test(name)) tags.add("fountain");
  if (BELOW_GRADE_RE.test(name)) tags.add("below-grade");
  if (PLAZA_RE.test(name)) tags.add("plaza-balcony");
  if (WATERPROOF_RE.test(name)) tags.add("masonry-waterproofing");
  if (DTM_RE.test(name)) tags.add("metal");

  const skipArchitectural =
    namedFloor ||
    tags.has("parking-deck") ||
    tags.has("roof") ||
    tags.has("pool") ||
    tags.has("fountain") ||
    tags.has("masonry-waterproofing") ||
    tags.has("below-grade") ||
    tags.has("plaza-balcony");
  if (skipArchitectural) return [...tags];

  const namedTrim = TRIM_RE.test(name);
  if (namedTrim || (product.exterior && subs.has("wood"))) {
    tags.add("trim");
  }
  if (CEILING_RE.test(name) || (product.interior && subs.has("drywall"))) {
    tags.add("ceilings");
  }
  if (SIDING_RE.test(name) || (product.exterior && subs.has("wood"))) {
    tags.add("siding");
  }
  if (
    !namedTrim &&
    (subs.has("drywall") ||
      subs.has("stucco") ||
      subs.has("masonry") ||
      (product.exterior &&
        (subs.has("wood") || subs.has("previously-painted"))))
  ) {
    tags.add("walls");
  }

  return [...tags];
}

export type MatchedProduct = {
  product: TdsProduct;
  manufacturer: Manufacturer;
};

/**
 * Filter catalog products (not primer+topcoat systems) by the Systems
 * page facets. Empty facet lists mean any.
 */
export function matchProducts(
  query: MatchQuery,
  catalog?: Catalog,
  role: CoatRole = "all",
): MatchedProduct[] {
  const source = catalog ?? CORPUS_CATALOG;
  const results: MatchedProduct[] = [];
  const wantInterior = query.interior === true;
  const wantExterior = query.exterior === true;
  const apps = listOf(query.applicationTypes, query.applicationType);
  const subs = listOf(query.substrates, query.substrate);
  const sheens = listOf(query.sheens, query.sheen);
  const brands = listOf(query.manufacturerIds, query.manufacturerId);

  for (const product of source.products) {
    if (role === "primer" && product.kind !== "primer") continue;
    if (role === "topcoat" && product.kind !== "topcoat") continue;
    const manufacturer = manufacturerById(product.manufacturerId, source);
    if (!manufacturer) continue;
    if (brands.length && !brands.includes(product.manufacturerId)) continue;
    if (wantInterior && wantExterior) {
      if (!product.interior && !product.exterior) continue;
    } else if (wantInterior && !product.interior) continue;
    else if (wantExterior && !product.exterior) continue;
    if (!overlap(product.substrates, subs)) continue;
    if (!overlap(applicationTypesFor(product), apps)) continue;
    if (!overlap(product.sheens, sheens)) continue;
    if (query.vocSensitive && product.vocGL > 50) continue;
    results.push({ product, manufacturer });
  }

  return results.sort((a, b) => {
    const brand = a.manufacturer.name.localeCompare(b.manufacturer.name);
    if (brand) return brand;
    return a.product.name.localeCompare(b.product.name);
  });
}

/**
 * Structured System Match.
 *
 * Rank systems from the seed corpus by substrate, interior/exterior,
 * optional failure mode, sheen, VOC, and manufacturer filter.
 *
 * This is deliberately not embeddings. `lib/systems/search.ts` is the
 * stub to swap in chunk/embedding retrieval later.
 */
export function matchSystems(
  query: MatchQuery,
  catalog: Catalog = CORPUS_CATALOG,
): MatchedSystem[] {
  const results: MatchedSystem[] = [];

  const wantInterior = query.interior === true;
  const wantExterior = query.exterior === true;
  const apps = listOf(query.applicationTypes, query.applicationType);
  const subs = listOf(query.substrates, query.substrate);
  const sheens = listOf(query.sheens, query.sheen);
  const brands = listOf(query.manufacturerIds, query.manufacturerId);

  for (const system of catalog.systems) {
    if (brands.length && !brands.includes(system.manufacturerId)) continue;
    if (wantInterior && wantExterior) {
      if (!system.interior && !system.exterior) continue;
    } else if (wantInterior && !system.interior) continue;
    else if (wantExterior && !system.exterior) continue;
    if (!overlap(system.substrates, subs)) continue;
    if (!overlap(system.applicationTypes, apps)) continue;

    const primer = productById(system.primerProductId, catalog);
    const topcoat = productById(system.topcoatProductId, catalog);
    const midcoat = system.midcoatProductId
      ? productById(system.midcoatProductId, catalog)
      : undefined;
    const manufacturer = manufacturerById(system.manufacturerId, catalog);
    if (!primer || !topcoat || !manufacturer) continue;

    if (!overlap(topcoat.sheens, sheens)) continue;
    if (query.vocSensitive) {
      const voc = Math.max(primer.vocGL, topcoat.vocGL);
      if (voc > 50) continue;
    }

    let score = 40 + system.rankHint;
    const reasons: string[] = [system.why];

    if (subs.length && overlap(system.substrates, subs)) {
      score += 20;
      reasons.push("Substrate is in the system’s listed uses.");
    }
    if (apps.length && overlap(system.applicationTypes, apps)) {
      score += 16;
      reasons.push("Specified for this application.");
    }

    if (query.failureMode && query.failureMode !== "none") {
      if (system.failureModes.includes(query.failureMode)) {
        score += 18;
        reasons.push("Addresses the selected condition / failure mode.");
      } else {
        score -= 8;
      }
    }

    if (query.vocSensitive) {
      score += 12;
      reasons.push("Low / zero VOC products in this system.");
    }

    if (query.traffic === "high" && topcoat.kind === "topcoat") {
      if (
        topcoat.sheens.includes("semi-gloss") ||
        topcoat.sheens.includes("gloss") ||
        topcoat.id.includes("urethane")
      ) {
        score += 8;
        reasons.push("Higher-build or enamel finish for traffic.");
      }
    }

    if (query.traffic === "exterior-exposed" && topcoat.exterior) {
      score += 6;
    }

    if (query.tempF != null) {
      if (query.tempF < topcoat.minTempF || query.tempF > topcoat.maxTempF) {
        score -= 22;
        reasons.push(
          `Air ${query.tempF}°F is outside this topcoat’s ${topcoat.minTempF}–${topcoat.maxTempF}°F window.`,
        );
      } else {
        score += 10;
        reasons.push("Fits the current air temperature window.");
      }
    }
    if (query.humidity != null && query.humidity > topcoat.maxHumidityPct) {
      score -= 14;
      reasons.push(
        `Humidity ${query.humidity}% is above this topcoat’s ${topcoat.maxHumidityPct}% max.`,
      );
    } else if (query.humidity != null) {
      score += 4;
    }
    if (
      query.rainWithinHours != null &&
      query.rainWithinHours <= 4 &&
      (topcoat.rainReadyMinutes ?? 240) <= 60
    ) {
      score += 12;
      reasons.push("Rain-ready film — better if showers are later today.");
    }

    results.push({
      system,
      manufacturer,
      primer,
      topcoat,
      midcoat,
      score,
      reasons,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function allManufacturers(catalog: Catalog = CORPUS_CATALOG) {
  return catalog.manufacturers;
}

export function citationFor(
  product: TdsProduct,
  catalog: Catalog = CORPUS_CATALOG,
) {
  return {
    manufacturer:
      manufacturerById(product.manufacturerId, catalog)?.name ??
      product.manufacturerId,
    name: product.name,
    revision: product.tdsRevision,
    date: product.tdsDate,
    url:
      product.documents?.find((d) => d.publicUrl)?.publicUrl ?? product.tdsUrl,
  };
}

export function systemCards(
  query: MatchQuery,
  catalog: Catalog = CORPUS_CATALOG,
) {
  return matchSystems(query, catalog).map((m) => ({
    ...m,
    primerCitation: citationFor(m.primer, catalog),
    topcoatCitation: citationFor(m.topcoat, catalog),
    midcoatCitation: m.midcoat ? citationFor(m.midcoat, catalog) : null,
  }));
}

export function describeSystem(
  system: TdsSystem,
  catalog: Catalog = CORPUS_CATALOG,
) {
  return {
    prep: system.prepNotes,
    primer: productById(system.primerProductId, catalog),
    topcoat: productById(system.topcoatProductId, catalog),
    midcoat: system.midcoatProductId
      ? productById(system.midcoatProductId, catalog)
      : undefined,
  };
}

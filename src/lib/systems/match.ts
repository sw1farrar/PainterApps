import { MANUFACTURERS, PRODUCTS, SYSTEMS } from "@/data/tds/corpus";
import type {
  MatchQuery,
  MatchedSystem,
  TdsProduct,
  TdsSystem,
} from "./types";

function productById(id: string): TdsProduct | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

function manufacturerById(id: string) {
  return MANUFACTURERS.find((m) => m.id === id);
}

function sheenOk(product: TdsProduct, sheen?: MatchQuery["sheen"]) {
  if (!sheen) return true;
  return product.sheens.includes(sheen);
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
export function matchSystems(query: MatchQuery): MatchedSystem[] {
  const results: MatchedSystem[] = [];

  for (const system of SYSTEMS) {
    if (query.manufacturerId && system.manufacturerId !== query.manufacturerId) {
      continue;
    }
    if (query.interior && !system.interior) continue;
    if (query.exterior && !system.exterior) continue;
    if (!system.substrates.includes(query.substrate)) continue;

    const primer = productById(system.primerProductId);
    const topcoat = productById(system.topcoatProductId);
    const midcoat = system.midcoatProductId
      ? productById(system.midcoatProductId)
      : undefined;
    const manufacturer = manufacturerById(system.manufacturerId);
    if (!primer || !topcoat || !manufacturer) continue;

    if (query.sheen && !sheenOk(topcoat, query.sheen)) continue;

    let score = 40 + system.rankHint;
    const reasons: string[] = [system.why];

    if (system.substrates.includes(query.substrate)) {
      score += 20;
      reasons.push("Substrate is in the system’s listed uses.");
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
      const voc = Math.max(primer.vocGL, topcoat.vocGL);
      if (voc <= 50) {
        score += 12;
        reasons.push("Low / zero VOC products in this system.");
      } else {
        score -= 6;
      }
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

export function allManufacturers() {
  return MANUFACTURERS;
}

export function citationFor(product: TdsProduct) {
  return {
    manufacturer:
      manufacturerById(product.manufacturerId)?.name ?? product.manufacturerId,
    name: product.name,
    revision: product.tdsRevision,
    date: product.tdsDate,
    url: product.tdsUrl,
  };
}

export function systemCards(query: MatchQuery) {
  return matchSystems(query).map((m) => ({
    ...m,
    primerCitation: citationFor(m.primer),
    topcoatCitation: citationFor(m.topcoat),
    midcoatCitation: m.midcoat ? citationFor(m.midcoat) : null,
  }));
}

export function describeSystem(system: TdsSystem) {
  return {
    prep: system.prepNotes,
    primer: productById(system.primerProductId),
    topcoat: productById(system.topcoatProductId),
    midcoat: system.midcoatProductId
      ? productById(system.midcoatProductId)
      : undefined,
  };
}

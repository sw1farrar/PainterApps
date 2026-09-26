import { describe, expect, it } from "vitest";
import { compareByQuality, qualityIndex } from "@/lib/systems/quality";
import type { TdsProduct } from "@/lib/systems/types";

function paint(
  partial: Partial<TdsProduct> & { name: string; specs?: Record<string, unknown> },
): TdsProduct {
  return {
    id: partial.id ?? partial.name,
    manufacturerId: "sw",
    sku: "",
    kind: "topcoat",
    substrates: [],
    interior: false,
    exterior: true,
    vocGL: 50,
    sheens: [],
    minTempF: 50,
    maxTempF: 90,
    maxHumidityPct: 85,
    tdsUrl: "",
    tdsRevision: "",
    tdsDate: "",
    notes: "",
    ...partial,
  };
}

function score(product: TdsProduct) {
  const index = qualityIndex(product);
  expect(index.score).not.toBeNull();
  return index.score as number;
}

describe("qualityIndex", () => {
  const emeraldExt = paint({
    name: "Emerald Exterior Acrylic Latex",
    specs: { volume_solids_pct: 43, weight_solids_pct: 59, resin_type: "100% Acrylic" },
    description:
      "Emerald Exterior Acrylic Latex is Sherwin-Williams’ best-in-class exterior architectural house paint. Excellent durability with resistance to blistering, peeling, and dirt pick-up; self-priming on most surfaces; patented cross-linking 100% acrylic technology.",
    minTempF: 35,
    maxTempF: 90,
    features: ["Mildew resistant coating film", "Self-priming (2 coats new construction, 1 coat repaint)"],
    benefits: ["Best-in-class exterior protection"],
  });

  const durationExt = paint({
    name: "Duration Exterior Acrylic",
    specs: { volume_solids_pct: 38, weight_solids_pct: 50, resin_type: "Acrylic" },
    description:
      "Duration Exterior Acrylic Latex with PermaLast technology for long-lasting exterior protection. Self-priming one-coat protection on most repaint surfaces.",
    minTempF: 35,
    maxTempF: 100,
    features: ["Excellent durability and hiding", "Resists blistering and peeling", "Mildew resistant coating film"],
  });

  const superPaintExt = paint({
    name: "SuperPaint Exterior Acrylic",
    specs: { volume_solids_pct: 36, weight_solids_pct: 52, resin_type: "100% Acrylic" },
    description:
      "SuperPaint Exterior Latex with Advanced Resin Technology provides outstanding adhesion and hide, resistance to early dirt pickup, and improved early moisture resistance.",
    minTempF: 35,
    maxTempF: 90,
    features: [
      "100% acrylic exterior latex",
      "Advanced Resin Technology for outstanding adhesion and hide",
      "Resistance to early dirt pickup",
      "Improved early moisture resistance (1–2 hours)",
      "Application down to 35°F",
      "Mildew resistant coating film",
      "Self-priming over many existing coatings",
    ],
  });

  const latitude = paint({
    name: "Latitude Exterior Acrylic Latex",
    specs: { volume_solids_pct: 34, weight_solids_pct: 46, resin_type: "100% Acrylic" },
    minTempF: 35,
    maxTempF: 120,
    description:
      "Latitude Exterior Acrylic Latex with ClimateFlex Technology for exceptional early moisture resistance.",
    features: [
      "ClimateFlex Technology for early moisture resistance",
      "Application from 35°F to 120°F air, surface, and material",
      "Excellent application, flow, and leveling",
      "Great dirt pickup resistance",
      "Mildew resistant coating film",
      "Self-priming over many existing coatings",
    ],
  });

  const emeraldInt = paint({
    name: "Emerald Interior Acrylic Latex",
    interior: true,
    exterior: false,
    specs: { volume_solids_pct: 40, weight_solids_pct: 58, resin_type: "Styrene Acrylic" },
    description:
      "Emerald Interior Acrylic Latex is Sherwin-Williams’ best-in-class interior architectural coating. Excellent washability and resistance to burnishing.",
    features: ["Anti-microbial properties that inhibit mold and mildew growth", "Outstanding hide"],
    benefits: ["Self-priming options over existing coatings"],
  });

  const durationHome = paint({
    name: "Duration Home Interior Acrylic Latex",
    interior: true,
    exterior: false,
    specs: { volume_solids_pct: 39, weight_solids_pct: 52, resin_type: "Styrene Acrylic" },
    description:
      "Duration Home Interior Acrylic Latex with Moisture Resistant Technology. Washability with resistance to stains, scuffs, and burnishing.",
    features: ["Anti-microbial agents inhibit mold and mildew growth on the paint film"],
    benefits: ["Durable beauty for high-traffic interiors", "Most stains wipe clean"],
  });

  const cashmere = paint({
    name: "Cashmere Interior Acrylic Latex",
    interior: true,
    exterior: false,
    specs: { volume_solids_pct: 39, weight_solids_pct: 54, resin_type: "Acrylic" },
    description:
      "Cashmere Interior Acrylic Latex glides on buttery smooth. Paint and primer in one with outstanding coverage and hide.",
    features: ["Scrubbable for easy cleaning and maintenance"],
  });

  const proMarEgg = paint({
    name: "ProMar 200 Zero VOC Eg-Shel",
    interior: true,
    exterior: false,
    specs: { volume_solids_pct: 42, weight_solids_pct: 54, resin_type: "Vinyl Acrylic" },
    description:
      "ProMar 200 Zero V.O.C. Interior Latex Eg-Shel is a durable, professional-quality interior vinyl acrylic finish.",
    features: ["Anti-microbial agents that inhibit mold and mildew growth on the paint film"],
  });

  const superPaintInt = paint({
    name: "SuperPaint Interior Acrylic Latex",
    interior: true,
    exterior: false,
    specs: { volume_solids_pct: 36, weight_solids_pct: 53, resin_type: "Vinyl Acrylic" },
    description:
      "SuperPaint Interior Acrylic Latex is a paint and primer with dependable hide, durability, and scrubbability.",
  });

  const proMarPrimer = paint({
    name: "ProMar 200 Zero VOC Primer",
    kind: "primer",
    interior: true,
    exterior: false,
    specs: { volume_solids_pct: 24, weight_solids_pct: 40, resin_type: "Vinyl Acrylic" },
    description:
      "ProMar 200 Zero V.O.C. Interior Latex Primer is a professional-quality interior vinyl acrylic primer.",
    features: ["Anti-microbial"],
  });

  const dynasty = paint({
    id: "behr-dynasty",
    manufacturerId: "behr",
    name: "Dynasty Exterior",
    specs: { volume_solids_pct: 45, weight_solids_pct: 58, resin_type: "100% Acrylic" },
    description:
      "Best-in-class 100% acrylic with a lifetime warranty and cross-linking technology. Self-priming, with excellent durability.",
    features: ["Mildew resistant", "Resists peeling and blistering"],
  });

  const contractor = paint({
    id: "bm-ultra-spec",
    manufacturerId: "bm",
    name: "Ultra Spec Exterior",
    specs: { volume_solids_pct: 35, weight_solids_pct: 52, resin_type: "Vinyl Acrylic" },
    description: "Professional-quality vinyl acrylic for production repaints.",
  });

  it("returns null without volume solids", () => {
    expect(qualityIndex(paint({ name: "No solids" })).score).toBeNull();
  });

  it("ignores manufacturer and keeps one decimal on a 0–10 scale", () => {
    const a = score(emeraldExt);
    const b = score({ ...emeraldExt, id: "copy", manufacturerId: "behr", name: "Same spec" });
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(9);
    expect(a).toBeLessThanOrEqual(10);
    expect(Number.isInteger(Math.round(a * 10))).toBe(true);
  });

  it("ranks exterior finishes by film, then by features that set them apart", () => {
    const top = score(emeraldExt);
    const better = score(durationExt);
    const flex = score(latitude);
    const good = score(superPaintExt);
    expect(top).toBeGreaterThan(better);
    expect(better - flex).toBeGreaterThanOrEqual(0.4);
    expect(flex - good).toBeGreaterThanOrEqual(0.5);
    expect(top - better).toBeGreaterThanOrEqual(0.6);
    expect(qualityIndex(latitude).claims.some((claim) => claim.id === "wideWindow")).toBe(true);
    expect(qualityIndex(latitude).claims.some((claim) => claim.id === "moisture")).toBe(true);
    expect(qualityIndex(latitude).applicationClass).toBe("exterior-topcoat");
  });

  it("scores primers against primers, not against house paint", () => {
    const primer = paint({
      name: "Extreme Bond Primer",
      kind: "primer",
      specs: { volume_solids_pct: 32, weight_solids_pct: 48, resin_type: "Urethane Modified Acrylic" },
      minTempF: 35,
      description: "High-quality waterborne urethane modified acrylic bonding primer.",
      features: [
        "Promotes adhesion on hard-to-paint surfaces",
        "Tightly bonds to slick and glossy surfaces",
      ],
    });
    const thin = paint({
      name: "ProMar 200 Zero VOC Primer",
      kind: "primer",
      interior: true,
      exterior: false,
      specs: { volume_solids_pct: 24, weight_solids_pct: 40, resin_type: "Vinyl Acrylic" },
      description: "Professional-quality interior vinyl acrylic primer.",
    });
    expect(qualityIndex(primer).applicationClass).toBe("primer");
    expect(score(primer)).toBeGreaterThan(7);
    expect(score(thin)).toBeGreaterThan(1);
    expect(score(thin)).toBeLessThan(4);
    const mixed = [latitude, primer, superPaintExt, thin].sort(compareByQuality).map((p) => p.name);
    expect(mixed.indexOf("Latitude Exterior Acrylic Latex")).toBeLessThan(mixed.indexOf("Extreme Bond Primer"));
    expect(mixed.indexOf("SuperPaint Exterior Acrylic")).toBeLessThan(mixed.indexOf("Extreme Bond Primer"));
    expect(mixed.at(-1)).toBe("ProMar 200 Zero VOC Primer");
  });

  it("keeps premium interiors above a high-solids vinyl acrylic", () => {
    expect(score(emeraldInt)).toBeGreaterThan(score(durationHome));
    expect(score(durationHome)).toBeGreaterThanOrEqual(score(cashmere) - 0.1);
    expect(score(cashmere)).toBeGreaterThan(score(proMarEgg));
    expect(score(proMarEgg)).toBeGreaterThan(score(superPaintInt));
  });

  it("places a higher-solids competitor above Emerald and a contractor vinyl below", () => {
    expect(score(dynasty)).toBeGreaterThan(score(emeraldExt));
    expect(score(contractor)).toBeLessThan(score(latitude));
    expect(score(contractor)).toBeLessThan(score(proMarEgg));
  });

  it("does not let marketing erase a large solids gap of the same resin", () => {
    const highSolids = paint({
      name: "High solids vinyl",
      specs: { volume_solids_pct: 42, resin_type: "Vinyl Acrylic" },
      description: "Vinyl acrylic wall paint.",
    });
    const marketed = paint({
      name: "Marketed vinyl",
      specs: { volume_solids_pct: 34, resin_type: "Vinyl Acrylic" },
      description:
        "Best-in-class lifetime warranty. Cross-linking technology, self-priming one-coat, washable, burnish resistant, moisture-resistant, stain-resistant, excellent durability and hide.",
    });
    expect(score(highSolids)).toBeGreaterThan(score(marketed));
  });

  it("lets resin outrank a small solids advantage", () => {
    const acrylic = paint({
      name: "Acrylic 40",
      specs: { volume_solids_pct: 40, resin_type: "100% Acrylic" },
      description: "100% acrylic exterior with excellent durability.",
    });
    const vinyl = paint({
      name: "Vinyl 42",
      specs: { volume_solids_pct: 42, resin_type: "Vinyl Acrylic" },
      description: "Durable vinyl acrylic.",
    });
    expect(score(acrylic)).toBeGreaterThan(score(vinyl) + 1);
  });

  it("scores the thin vinyl primer near the bottom of the scale", () => {
    const low = score(proMarPrimer);
    expect(low).toBeGreaterThan(1);
    expect(low).toBeLessThan(4);
    expect(qualityIndex(proMarPrimer).claims.some((c) => c.id === "extender")).toBe(true);
    expect(qualityIndex(proMarPrimer).claims.some((c) => c.id === "contractorLine")).toBe(true);
  });

  it("sorts mixed manufacturers by score, not brand", () => {
    const products = [contractor, dynasty, emeraldExt, latitude, proMarPrimer];
    const names = [...products].sort(compareByQuality).map((p) => p.name);
    expect(names[0]).toBe("Dynasty Exterior");
    expect(names[1]).toBe("Emerald Exterior Acrylic Latex");
    expect(names.at(-1)).toBe("ProMar 200 Zero VOC Primer");
    expect(names.indexOf("Ultra Spec Exterior")).toBeGreaterThan(names.indexOf("Latitude Exterior Acrylic Latex"));
  });
});

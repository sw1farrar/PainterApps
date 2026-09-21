import { describe, expect, it } from "vitest";
import { CORPUS_CATALOG } from "./corpus-catalog";
import {
  applicationTypesFor,
  matchProducts,
  matchSystems,
} from "./match";

describe("matchSystems", () => {
  it("returns interior drywall systems and cites manufacturers", () => {
    const results = matchSystems({
      interior: true,
      exterior: false,
      substrate: "drywall",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.system.interior)).toBe(true);
    expect(results.every((r) => r.manufacturer.name.length > 0)).toBe(true);
    expect(results.every((r) => r.primer.tdsUrl.startsWith("http"))).toBe(
      true,
    );
  });

  it("filters by manufacturer", () => {
    const results = matchSystems({
      interior: false,
      exterior: true,
      substrate: "wood",
      manufacturerId: "sw",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.manufacturer.id === "sw")).toBe(true);
  });

  it("boosts systems that address efflorescence", () => {
    const results = matchSystems({
      interior: false,
      exterior: true,
      substrate: "masonry",
      failureMode: "efflorescence",
    });
    expect(results[0]?.system.failureModes).toContain("efflorescence");
  });

  it("lists exterior systems before a substrate is chosen", () => {
    const results = matchSystems({
      interior: false,
      exterior: true,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.system.exterior)).toBe(true);
  });

  it("filters by parking-deck application and finds none in the latex corpus", () => {
    const results = matchSystems({
      interior: false,
      exterior: true,
      applicationType: "parking-deck",
    });
    expect(results).toHaveLength(0);
  });

  it("keeps exterior trim and wood-deck available on tagged systems", () => {
    const trim = matchSystems({
      interior: false,
      exterior: true,
      applicationType: "trim",
    });
    expect(trim.length).toBeGreaterThan(0);
    expect(trim.every((r) => r.system.applicationTypes?.includes("trim"))).toBe(
      true,
    );
    const decks = matchSystems({
      interior: false,
      exterior: true,
      applicationType: "wood-deck",
    });
    expect(decks.length).toBeGreaterThan(0);
    expect(
      decks.every((r) => r.system.applicationTypes?.includes("wood-deck")),
    ).toBe(true);
  });

  it("filters exterior walls from siding/wall systems", () => {
    const results = matchSystems({
      interior: false,
      exterior: true,
      applicationType: "siding",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((r) => r.system.applicationTypes?.includes("siding")),
    ).toBe(true);
  });

  it("lets interior and exterior both be on and keeps dual-use systems", () => {
    const results = matchSystems({
      interior: true,
      exterior: true,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.system.interior && r.system.exterior)).toBe(
      true,
    );
    expect(results.some((r) => r.system.interior && !r.system.exterior)).toBe(
      true,
    );
    expect(results.some((r) => r.system.exterior && !r.system.interior)).toBe(
      true,
    );
  });

  it("ORs multiple application tags so siding and trim can both be selected", () => {
    const results = matchSystems({
      interior: false,
      exterior: true,
      applicationTypes: ["siding", "trim"],
    });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (r) =>
          r.system.applicationTypes?.includes("siding") ||
          r.system.applicationTypes?.includes("trim"),
      ),
    ).toBe(true);
  });

  it("prefers low VOC when requested", () => {
    const results = matchSystems({
      interior: true,
      exterior: false,
      substrate: "drywall",
      vocSensitive: true,
    });
    const topVoc = Math.max(
      results[0].primer.vocGL,
      results[0].topcoat.vocGL,
    );
    expect(topVoc).toBeLessThanOrEqual(50);
  });
});

describe("matchProducts", () => {
  const productsOnly = {
    ...CORPUS_CATALOG,
    systems: [],
  };

  it("lists products when the catalog has no systems", () => {
    const results = matchProducts(
      { interior: false, exterior: true },
      productsOnly,
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.product.exterior)).toBe(true);
  });

  it("filters primers and topcoats by coat role", () => {
    const primers = matchProducts(
      { interior: false, exterior: true },
      productsOnly,
      "primer",
    );
    const topcoats = matchProducts(
      { interior: false, exterior: true },
      productsOnly,
      "topcoat",
    );
    expect(primers.length).toBeGreaterThan(0);
    expect(topcoats.length).toBeGreaterThan(0);
    expect(primers.every((r) => r.product.kind === "primer")).toBe(true);
    expect(topcoats.every((r) => r.product.kind === "topcoat")).toBe(true);
  });

  it("filters by manufacturer", () => {
    const results = matchProducts(
      { interior: false, exterior: true, manufacturerId: "sw" },
      productsOnly,
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.manufacturer.id === "sw")).toBe(true);
  });

  it("filters exterior walls from architectural coatings", () => {
    const results = matchProducts(
      {
        interior: false,
        exterior: true,
        applicationType: "walls",
      },
      productsOnly,
    );
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((r) => applicationTypesFor(r.product).includes("walls")),
    ).toBe(true);
  });

  it("finds no parking-deck products in the latex corpus", () => {
    const results = matchProducts(
      {
        interior: false,
        exterior: true,
        applicationType: "parking-deck",
      },
      productsOnly,
    );
    expect(results).toHaveLength(0);
  });

  it("tags porch and patio products as floors and wood-deck, not walls", () => {
    const porch = CORPUS_CATALOG.products.find((p) =>
      p.name.toLowerCase().includes("porch"),
    );
    expect(porch).toBeTruthy();
    const tags = applicationTypesFor(porch!);
    expect(tags).toEqual(expect.arrayContaining(["floors", "wood-deck"]));
    expect(tags).not.toContain("walls");
  });

  it("ORs interior and exterior when both are on", () => {
    const results = matchProducts(
      { interior: true, exterior: true },
      productsOnly,
    );
    expect(results.some((r) => r.product.interior && !r.product.exterior)).toBe(
      true,
    );
    expect(results.some((r) => r.product.exterior && !r.product.interior)).toBe(
      true,
    );
  });
});

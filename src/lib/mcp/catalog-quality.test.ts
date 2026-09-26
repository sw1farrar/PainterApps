import { describe, expect, it } from "vitest";
import { selectProducts } from "@/lib/mcp/catalog";
import type { TdsProduct } from "@/lib/systems/types";

function paint(
  partial: Partial<TdsProduct> & { name: string; id: string },
): TdsProduct {
  return {
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

describe("selectProducts", () => {
  const latitude = paint({
    id: "lat",
    name: "Latitude",
    qualityScore: 6.4,
    qualitySummary: "Wide-window exterior, not a higher film than Duration.",
    minTempF: 35,
    maxTempF: 120,
    specs: { volume_solids_pct: 34, resin_type: "100% Acrylic" },
    features: ["Application from 35°F to 120°F"],
  });
  const superPaint = paint({
    id: "sp",
    name: "SuperPaint",
    qualityScore: 6.8,
    specs: { volume_solids_pct: 36, resin_type: "100% Acrylic" },
  });
  const primer = paint({
    id: "eb",
    name: "Extreme Bond",
    kind: "primer",
    qualityScore: 8.4,
    specs: { volume_solids_pct: 32, resin_type: "Urethane Modified Acrylic" },
  });

  it("returns the stored quality block and keeps jobs in separate ladders", () => {
    const rows = selectProducts([primer, latitude, superPaint], {});
    expect(rows.map((row) => row.id)).toEqual(["sp", "lat", "eb"]);
    expect(rows[0].quality.score).toBe(6.8);
    expect(rows[1].quality.summary).toMatch(/Wide-window/);
    expect(rows[2].quality.application_class).toBe("primer");
  });

  it("filters to one application class", () => {
    const rows = selectProducts([primer, latitude], {
      application_class: "primer",
    });
    expect(rows.map((row) => row.id)).toEqual(["eb"]);
  });
});

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
    minTempF: 35,
    maxTempF: 120,
    specs: { volume_solids_pct: 34, resin_type: "100% Acrylic" },
    description: "ClimateFlex Technology for exceptional early moisture resistance.",
    features: ["Application from 35°F to 120°F", "Great dirt pickup resistance"],
  });
  const superPaint = paint({
    id: "sp",
    name: "SuperPaint",
    minTempF: 35,
    specs: { volume_solids_pct: 36, resin_type: "100% Acrylic" },
    description: "Improved early moisture resistance and early dirt pickup.",
  });
  const primer = paint({
    id: "eb",
    name: "Extreme Bond",
    kind: "primer",
    specs: { volume_solids_pct: 32, resin_type: "Urethane Modified Acrylic" },
    description: "Bonding primer that promotes adhesion on hard-to-paint surfaces.",
    features: ["Tightly bonds to slick and glossy surfaces"],
  });

  it("returns the computed quality block and ranks finishes above primers", () => {
    const rows = selectProducts([primer, superPaint, latitude], {});
    expect(rows.map((row) => row.id)).toEqual(["lat", "sp", "eb"]);
    expect(rows[0].quality.application_class).toBe("exterior-topcoat");
    expect(rows[0].quality.score).toBeGreaterThan(rows[1].quality.score ?? 0);
    expect(rows[2].quality.application_class).toBe("primer");
    expect(rows[0].quality.claims.some((claim) => claim.id === "wideWindow")).toBe(
      true,
    );
  });

  it("filters to one application class", () => {
    const rows = selectProducts([primer, latitude], {
      application_class: "primer",
    });
    expect(rows.map((row) => row.id)).toEqual(["eb"]);
  });
});

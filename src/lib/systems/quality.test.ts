import { describe, expect, it } from "vitest";
import { applicationClass, compareByQuality, storedScore } from "@/lib/systems/quality";
import type { TdsProduct } from "@/lib/systems/types";

function paint(partial: Partial<TdsProduct> & { name: string }): TdsProduct {
  return {
    id: partial.name,
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

describe("stored quality", () => {
  it("keeps primers out of the finish ladder and sorts by the stored score", () => {
    const latitude = paint({
      name: "Latitude",
      qualityScore: 6.4,
      description: "Wide application window and early moisture resistance.",
    });
    const duration = paint({ name: "Duration", qualityScore: 8.2 });
    const primer = paint({
      name: "Extreme Bond",
      kind: "primer",
      qualityScore: 9.1,
    });
    const unrated = paint({ name: "No rank yet", qualityScore: null });
    expect(applicationClass(latitude)).toBe("exterior-topcoat");
    expect(applicationClass(primer)).toBe("primer");
    expect(storedScore(latitude)).toBe(6.4);
    const names = [primer, unrated, latitude, duration].sort(compareByQuality).map((p) => p.name);
    expect(names).toEqual(["Duration", "Latitude", "No rank yet", "Extreme Bond"]);
  });

  it("does not rank a wide-window product above a higher stored score", () => {
    const specialty = paint({
      name: "Latitude",
      qualityScore: 6.2,
      minTempF: 35,
      maxTempF: 120,
      features: ["Application from 35°F to 120°F", "Early moisture resistance"],
    });
    const standard = paint({ name: "SuperPaint", qualityScore: 6.8 });
    expect(compareByQuality(specialty, standard)).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { calculateCoverage } from "./coverage";

describe("calculateCoverage", () => {
  it("computes a sealed one-coat 350 sq ft job as 1 gallon", () => {
    const result = calculateCoverage({
      area: 350,
      unit: "sqft",
      porosity: "sealed",
      coats: 1,
      wastePercent: 0,
    });
    expect(result.gallons).toBeCloseTo(1, 5);
  });

  it("doubles gallons for two coats", () => {
    const one = calculateCoverage({
      area: 400,
      unit: "sqft",
      porosity: "normal",
      coats: 1,
      wastePercent: 0,
    });
    const two = calculateCoverage({
      area: 400,
      unit: "sqft",
      porosity: "normal",
      coats: 2,
      wastePercent: 0,
    });
    expect(two.gallons).toBeCloseTo(one.gallons * 2, 5);
  });

  it("adds waste on top of coverage", () => {
    const base = calculateCoverage({
      area: 350,
      unit: "sqft",
      porosity: "sealed",
      coats: 1,
      wastePercent: 0,
    });
    const waste = calculateCoverage({
      area: 350,
      unit: "sqft",
      porosity: "sealed",
      coats: 1,
      wastePercent: 10,
    });
    expect(waste.gallons).toBeCloseTo(base.gallons * 1.1, 5);
  });

  it("converts square metres", () => {
    const result = calculateCoverage({
      area: 10,
      unit: "sqm",
      porosity: "sealed",
      coats: 1,
      wastePercent: 0,
    });
    expect(result.areaSqft).toBeCloseTo(107.639, 2);
  });
});

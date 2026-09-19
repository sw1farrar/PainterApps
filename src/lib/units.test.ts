import { describe, expect, it } from "vitest";
import { areaUnitFor, fToC, formatTempRange, isUnitSystem } from "./units";

describe("units", () => {
  it("converts the latex window to C", () => {
    expect(fToC(50)).toBe(10);
    expect(fToC(90)).toBe(32);
    expect(formatTempRange(50, 90, "metric")).toBe("10–32°C");
    expect(formatTempRange(50, 90, "imperial")).toBe("50–90°F");
  });

  it("maps area units", () => {
    expect(areaUnitFor("metric")).toBe("sqm");
    expect(areaUnitFor("imperial")).toBe("sqft");
    expect(isUnitSystem("metric")).toBe(true);
    expect(isUnitSystem("kelvin")).toBe(false);
  });
});

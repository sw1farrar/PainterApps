import { describe, expect, it } from "vitest";
import { matchSystems } from "./match";

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

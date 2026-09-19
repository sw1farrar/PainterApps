import { describe, expect, it } from "vitest";
import { matchMetros } from "./match-metros";

describe("matchMetros", () => {
  it("ranks Denver from a ZIP prefix", () => {
    const hits = matchMetros("802");
    expect(hits[0]?.zip).toMatch(/^802/);
    expect(hits[0]?.city).toMatch(/Denver/i);
  });

  it("ranks a city name prefix", () => {
    const hits = matchMetros("den");
    expect(hits[0]?.city.toLowerCase()).toContain("den");
  });
});

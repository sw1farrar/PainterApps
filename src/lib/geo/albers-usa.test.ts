import { describe, expect, it } from "vitest";
import { projectUsa } from "./albers-usa";

describe("projectUsa", () => {
  it("places Seattle west of New York and north of Miami", () => {
    const sea = projectUsa(47.6062, -122.3321);
    const nyc = projectUsa(40.7506, -73.9971);
    const mia = projectUsa(25.765, -80.19);
    expect(sea.x).toBeLessThan(nyc.x);
    expect(sea.y).toBeLessThan(mia.y);
    expect(nyc.x).toBeGreaterThan(mia.x - 40);
  });

  it("puts Alaska and Hawaii in the lower-left insets", () => {
    const anc = projectUsa(61.2181, -149.9003);
    const hon = projectUsa(21.3069, -157.8583);
    const den = projectUsa(39.7392, -104.9903);
    expect(anc.region).toBe("ak");
    expect(hon.region).toBe("hi");
    expect(den.region).toBe("conus");
    expect(anc.y).toBeGreaterThan(den.y);
    expect(hon.y).toBeGreaterThan(den.y);
    expect(anc.x).toBeLessThan(den.x);
  });
});

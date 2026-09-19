import { describe, expect, it } from "vitest";
import {
  areaTakeoff,
  hoursForSurface,
  paintScoutBedroomExample,
  priceEstimate,
} from "./time-based";

describe("areaTakeoff", () => {
  it("computes a 12×15×8 room", () => {
    const t = areaTakeoff({
      name: "Bedroom",
      kind: "room",
      length: 12,
      width: 15,
      height: 8,
    });
    expect(t.wallSqft).toBe(432);
    expect(t.ceilingSqft).toBe(180);
    expect(t.baseLnft).toBe(54);
  });
});

describe("hoursForSurface", () => {
  it("divides sqft by rate", () => {
    expect(hoursForSurface(400, 100, "sqft_per_hr")).toBe(4);
  });
  it("multiplies items by hours", () => {
    expect(hoursForSurface(3, 0.5, "hr_per_item")).toBe(1.5);
  });
});

describe("paintScoutBedroomExample", () => {
  it("matches the published 13.5 hr / $904.50 labor", () => {
    const result = paintScoutBedroomExample(67);
    expect(result.takeoff.wallSqft).toBe(432);
    expect(result.hours).toBeCloseTo(13.5, 5);
    expect(result.labor).toBeCloseTo(904.5, 5);
  });
});

describe("priceEstimate", () => {
  it("sums areas", () => {
    const one = paintScoutBedroomExample(67);
    const totals = priceEstimate(
      [
        {
          area: {
            name: "Bedroom",
            kind: "room",
            length: 12,
            width: 15,
            height: 8,
          },
          surfaces: [
            { label: "Walls", unit: "sqft_per_hr", coats: 2, rate: 85 },
            { label: "Ceiling", unit: "sqft_per_hr", coats: 2, rate: 60 },
            { label: "Baseboards", unit: "lnft_per_hr", coats: 2, rate: 25 },
            {
              label: "Window frames",
              unit: "hr_per_item",
              coats: 2,
              rate: 0.5,
              qty: 2,
            },
            {
              label: "Door & frame 1 side",
              unit: "hr_per_item",
              coats: 2,
              rate: 1.5,
              qty: 1,
            },
          ],
        },
      ],
      67,
    );
    expect(totals.hours).toBeCloseTo(one.hours, 5);
    expect(totals.total).toBeCloseTo(904.5, 5);
  });
});

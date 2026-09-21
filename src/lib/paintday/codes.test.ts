import { describe, expect, it } from "vitest";
import { isHardPrecip, isSoakingPrecip, precipKind } from "./codes";

describe("precipKind", () => {
  it("calls 51–55 drizzle and 61 rain", () => {
    expect(precipKind(51)).toBe("drizzle");
    expect(precipKind(53)).toBe("drizzle");
    expect(precipKind(61)).toBe("rain");
    expect(precipKind(3)).toBe("none");
  });
});

describe("isHardPrecip", () => {
  it("wets drizzle at 0.2 mm and leaves 0 mm drizzle dry", () => {
    expect(isHardPrecip(51, 0)).toBe(false);
    expect(isHardPrecip(51, 0.19)).toBe(false);
    expect(isHardPrecip(51, 0.2)).toBe(true);
    expect(isHardPrecip(51, 0.4)).toBe(true);
  });
});

describe("isSoakingPrecip", () => {
  it("does not soak light drizzle under 1 mm", () => {
    expect(isSoakingPrecip(51, 0.4)).toBe(false);
    expect(isSoakingPrecip(53, 0.9)).toBe(false);
  });

  it("soaks rain codes, storms, and 1 mm+", () => {
    expect(isSoakingPrecip(61, 0.4)).toBe(true);
    expect(isSoakingPrecip(95, 0)).toBe(true);
    expect(isSoakingPrecip(51, 1)).toBe(true);
    expect(isSoakingPrecip(3, 1.2)).toBe(true);
  });
});

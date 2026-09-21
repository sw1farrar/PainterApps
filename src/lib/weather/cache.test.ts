import { describe, expect, it } from "vitest";
import { WEATHER_REVALIDATE_SECONDS, weatherCacheBucket } from "./cache";

describe("weatherCacheBucket", () => {
  it("stays stable inside a 15-minute window and advances after", () => {
    const t = Date.UTC(2026, 8, 20, 16, 0, 0);
    const a = weatherCacheBucket(t);
    const b = weatherCacheBucket(t + (WEATHER_REVALIDATE_SECONDS - 1) * 1000);
    const c = weatherCacheBucket(t + WEATHER_REVALIDATE_SECONDS * 1000);
    expect(a).toBe(b);
    expect(c).toBe(a + 1);
  });
});

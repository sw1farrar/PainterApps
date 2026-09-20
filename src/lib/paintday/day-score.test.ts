import { describe, expect, it } from "vitest";
import { scorePaintDay } from "./score";
import type { HourSlot } from "./crew-plan";
import { scoreDayFromHours } from "./day-score";

function hour(h: number, extra: Partial<HourSlot["snapshot"]> = {}): HourSlot {
  const snapshot = {
    precipProbability: 10,
    precipMm: 0,
    humidity: 50,
    tempF: 72,
    dewPointF: 50,
    windMph: 5,
    minTempNext48hF: 55,
    ...extra,
  };
  return {
    time: `2026-09-19T${String(h).padStart(2, "0")}:00`,
    date: "2026-09-19",
    hour: h,
    snapshot,
    score: scorePaintDay(snapshot),
  };
}

describe("scoreDayFromHours", () => {
  it("keeps a dry morning when afternoon rains", () => {
    const hours = [
      ...[7, 8, 9, 10, 11, 12].map((h) => hour(h)),
      hour(13, { precipMm: 1.5, weatherCode: 61, precipProbability: 80 }),
      hour(14, { precipMm: 2, weatherCode: 80, precipProbability: 90 }),
    ];
    const day = scoreDayFromHours(hours);
    expect(day.score.total).toBeGreaterThanOrEqual(80);
    expect(day.representativeHour).toBe(10);
    expect(day.crewPlan.rainHour).toBe(13);
    expect(day.crewPlan.wrapHour).toBeLessThan(13);
  });
});

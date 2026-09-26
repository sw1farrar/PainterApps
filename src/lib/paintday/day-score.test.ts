import { describe, expect, it } from "vitest";
import { scorePaintDay } from "./score";
import type { HourSlot } from "./crew-plan";
import { windowLine } from "./format";
import { RAIN_RED, mapDotColors } from "./map-scores";
import { afternoonHalf, morningHalf, scoreDayFromHours } from "./day-score";
import { DRIZZLE_CAUTION_CAP, dayDisplayTotal, dayIsClosed } from "./today";

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
    expect(day.score.total).toBeGreaterThanOrEqual(70);
    expect(day.crewPlan.rainHour).toBe(13);
    expect(day.crewPlan.wrapHour).toBeLessThanOrEqual(9);
  });

  it("does not mark a dry humid coastal day do-not-paint", () => {
    const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((h) =>
      hour(h, {
        humidity: 93,
        tempF: 59,
        dewPointF: 57,
        windMph: 11,
        precipMm: 0,
        precipProbability: 20,
        weatherCode: 3,
      }),
    );
    const day = scoreDayFromHours(hours);
    expect(day.score.band).not.toBe("do-not-paint");
    expect(day.score.total).toBeGreaterThanOrEqual(30);
  });

  it("flags morning rain even when the afternoon dries out", () => {
    const hours = [
      hour(8, { precipMm: 1.2, weatherCode: 61, precipProbability: 90 }),
      hour(9, { precipMm: 0.8, weatherCode: 61, precipProbability: 80 }),
      hour(10, { precipMm: 0.4, weatherCode: 63, precipProbability: 70 }),
      ...[13, 14, 15, 16].map((h) => hour(h)),
    ];
    const am = morningHalf(hours);
    const pm = afternoonHalf(hours);
    expect(am.wet).toBe(true);
    expect(pm.wet).toBe(false);
    expect(pm.score).toBeGreaterThanOrEqual(70);
  });

  it("keeps an afternoon window after 9am drizzle and scores that block", () => {
    const hours = [
      ...[7, 8].map((h) => hour(h)),
      hour(9, { precipMm: 0.4, weatherCode: 51, precipProbability: 2 }),
      ...[10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) =>
        hour(h, { precipProbability: 0 }),
      ),
    ];
    const day = scoreDayFromHours(hours);
    expect(morningHalf(hours).wet).toBe(true);
    expect(afternoonHalf(hours).wet).toBe(false);
    expect(day.crewPlan.rainHour).toBe(9);
    expect(day.crewPlan.startHour).toBe(13);
    expect(day.crewPlan.hoursOpen).toBe(6);
    expect(day.score.total).toBeGreaterThanOrEqual(70);
    expect(Math.max(...day.block.map((h) => h.snapshot.precipProbability))).toBe(
      0,
    );
    expect(day.block.every((h) => h.hour >= 13)).toBe(true);
  });

  it("flags afternoon rain with a dry morning", () => {
    const hours = [
      ...[7, 8, 9, 10, 11, 12].map((h) => hour(h)),
      hour(14, { precipMm: 2, weatherCode: 80, precipProbability: 90 }),
      hour(15, { precipMm: 1, weatherCode: 61, precipProbability: 80 }),
    ];
    const pm = afternoonHalf(hours);
    expect(morningHalf(hours).wet).toBe(false);
    expect(pm.wet).toBe(true);
    expect(pm.rainedOut).toBe(true);
    expect(pm.witness?.hour).toBe(14);
    expect(pm.witness?.precipMm).toBe(2);
  });

  it("does not paint a cleared afternoon solid red after a morning downpour", () => {
    const hours = [
      hour(7),
      hour(8, { precipMm: 10.8, weatherCode: 65, precipProbability: 90 }),
      ...[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => hour(h)),
    ];
    const day = scoreDayFromHours(hours);
    const am = morningHalf(hours);
    const pm = afternoonHalf(hours);
    expect(am.wet).toBe(true);
    expect(am.rainedOut).toBe(true);
    expect(pm.wet).toBe(false);
    expect(pm.rainedOut).toBe(false);
    expect(day.crewPlan.rainHour).toBe(8);
    expect(day.crewPlan.startHour).toBe(13);
    expect(day.crewPlan.hoursOpen).toBe(6);
    expect(day.score.total).toBeGreaterThanOrEqual(70);
    expect(dayIsClosed({ amWet: am.wet, hoursOpen: day.crewPlan.hoursOpen })).toBe(
      false,
    );
    expect(
      dayDisplayTotal({
        score: day.score,
        amWet: am.wet,
        pmWet: pm.wet,
        hoursOpen: day.crewPlan.hoursOpen,
        rainHour: day.crewPlan.rainHour,
        startHour: day.crewPlan.startHour,
      }),
    ).toBe(DRIZZLE_CAUTION_CAP);
    const dots = mapDotColors({
      amWet: am.wet,
      pmWet: pm.wet,
      amRainedOut: am.rainedOut,
      pmRainedOut: pm.rainedOut,
      amScore: am.score,
      pmScore: pm.score,
      score: day.score.total,
      hoursOpen: day.crewPlan.hoursOpen,
      startHour: day.crewPlan.startHour,
    });
    expect(dots.split).toBe(true);
    expect(dots.left).toBe(RAIN_RED);
    expect(dots.right).not.toBe(RAIN_RED);
  });

  it("splits a day that rains into the afternoon and then clears", () => {
    const hours = [
      ...[7, 8, 9, 10, 11, 12, 13].map((h) =>
        hour(h, { precipMm: 2, weatherCode: 63, precipProbability: 80 }),
      ),
      ...[14, 15, 16, 17, 18].map((h) => hour(h)),
    ];
    const day = scoreDayFromHours(hours);
    const am = morningHalf(hours);
    const pm = afternoonHalf(hours);
    expect(day.crewPlan.startHour).toBe(14);
    expect(day.crewPlan.hoursOpen).toBe(5);
    expect(pm.rainedOut).toBe(true);
    const dots = mapDotColors({
      amWet: am.wet,
      pmWet: pm.wet,
      amRainedOut: am.rainedOut,
      pmRainedOut: pm.rainedOut,
      amScore: am.score,
      pmScore: pm.score,
      score: day.score.total,
      hoursOpen: day.crewPlan.hoursOpen,
      startHour: day.crewPlan.startHour,
    });
    expect(dots.split).toBe(true);
    expect(dots.left).toBe(RAIN_RED);
    expect(dots.right).not.toBe(RAIN_RED);
  });

  it("does not rain out a Yuma afternoon that only drizzles at 5pm", () => {
    const hours = [
      ...[7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((h) => hour(h, { tempF: 88 })),
      hour(17, { precipMm: 0.5, weatherCode: 53, precipProbability: 1, tempF: 100 }),
      hour(18, { precipMm: 0.4, weatherCode: 51, precipProbability: 5, tempF: 98 }),
    ];
    const am = morningHalf(hours);
    const pm = afternoonHalf(hours);
    expect(am.wet).toBe(false);
    expect(pm.wet).toBe(true);
    expect(pm.rainedOut).toBe(false);
    expect(pm.witness?.hour).toBe(17);
    expect(pm.witness?.precipMm).toBe(0.5);
    const dots = mapDotColors({
      amWet: am.wet,
      pmWet: pm.wet,
      amRainedOut: am.rainedOut,
      pmRainedOut: pm.rainedOut,
      amScore: am.score,
      pmScore: pm.score,
      score: am.score,
      hoursOpen: 7,
    });
    expect(dots.split).toBe(false);
    expect(dots.left).not.toBe("#ef4444");
    expect(dots.right).not.toBe("#ef4444");
  });

  it("does not wet an afternoon on probability or a clear-sky trace", () => {
    const pop = [13, 14, 15, 16, 17, 18].map((h) =>
      hour(h, { precipProbability: 80, precipMm: 0, weatherCode: 0 }),
    );
    expect(afternoonHalf(pop).wet).toBe(false);
    const trace = [13, 14, 15, 16, 17, 18].map((h) =>
      hour(h, h === 15 ? { precipMm: 0.3, weatherCode: 1, precipProbability: 0 } : {}),
    );
    expect(afternoonHalf(trace).wet).toBe(false);
  });
});

describe("mapDotColors", () => {
  it("paints the whole day red when the morning is wet", () => {
    const dots = mapDotColors({
      amWet: true,
      pmWet: false,
      amScore: 80,
      score: 80,
    });
    expect(dots.left).toBe("#ef4444");
    expect(dots.right).toBe("#ef4444");
    expect(dots.split).toBe(false);
  });

  it("splits AM color and PM red when the afternoon is rained out", () => {
    const dots = mapDotColors({
      amWet: false,
      pmWet: true,
      pmRainedOut: true,
      amScore: 82,
      score: 82,
      hoursOpen: 4,
    });
    expect(dots.split).toBe(true);
    expect(dots.right).toBe("#ef4444");
    expect(dots.left).not.toBe("#ef4444");
  });

  it("does not paint the afternoon red for light drizzle with dry hours left", () => {
    const dots = mapDotColors({
      amWet: false,
      pmWet: true,
      pmRainedOut: false,
      amScore: 90,
      score: 90,
      hoursOpen: 6,
    });
    expect(dots.split).toBe(false);
    expect(dots.right).not.toBe("#ef4444");
  });

  it("splits AM red and PM score when morning drizzle leaves an afternoon window", () => {
    const dots = mapDotColors({
      amWet: true,
      pmWet: false,
      pmScore: 98,
      score: 98,
      hoursOpen: 6,
    });
    expect(dots.split).toBe(true);
    expect(dots.left).toBe("#ef4444");
    expect(dots.right).not.toBe("#ef4444");
  });
});

describe("windowLine", () => {
  it("names drizzle that already passed before the paint window", () => {
    expect(windowLine(13, 18, 9)).toBe("1pm–6pm · after 9am drizzle");
  });

  it("names a downpour that already passed before the paint window", () => {
    expect(windowLine(13, 18, 8, false, true)).toBe("1pm–6pm · after 8am rain");
  });

  it("names late light drizzle instead of calling it rain", () => {
    expect(windowLine(7, 13, 17, true)).toBe("7am–1pm · drizzle 5pm");
  });
});

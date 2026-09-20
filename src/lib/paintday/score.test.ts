import { describe, expect, it } from "vitest";
import {
  SCORE_WEIGHTS,
  bandForScore,
  scoreDewPoint,
  scoreFreeze,
  scoreHumidity,
  scorePaintDay,
  scorePrecip,
  scoreTemperature,
  scoreWind,
} from "./score";

describe("SCORE_WEIGHTS", () => {
  it("sums to 1", () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 8);
  });
});

describe("factor scorers", () => {
  it("rewards a dry day", () => {
    expect(scorePrecip(0)).toBe(100);
    expect(scorePrecip(10, 0, 1.2, 61)).toBeLessThan(10);
  });

  it("likes 40–70% humidity", () => {
    expect(scoreHumidity(55)).toBe(100);
    expect(scoreHumidity(95)).toBeLessThan(30);
  });

  it("likes 60–80°F", () => {
    expect(scoreTemperature(72)).toBe(100);
    expect(scoreTemperature(35)).toBeLessThan(20);
    expect(scoreTemperature(105)).toBeLessThan(20);
  });

  it("penalizes a tight dew-point spread", () => {
    expect(scoreDewPoint(70, 50)).toBe(100);
    expect(scoreDewPoint(70, 68)).toBeLessThan(30);
  });

  it("penalizes high wind", () => {
    expect(scoreWind(4)).toBe(100);
    expect(scoreWind(28)).toBeLessThan(10);
  });

  it("penalizes freeze risk", () => {
    expect(scoreFreeze(55)).toBe(100);
    expect(scoreFreeze(50)).toBe(75);
    expect(scoreFreeze(28)).toBeLessThan(10);
  });
});

describe("scorePaintDay", () => {
  it("scores a classic good exterior day highly", () => {
    const result = scorePaintDay({
      precipProbability: 5,
      humidity: 48,
      tempF: 72,
      dewPointF: 52,
      windMph: 6,
      minTempNext48hF: 55,
    });
    expect(result.total).toBeGreaterThanOrEqual(85);
    expect(result.band).toBe("excellent");
    expect(result.summaryKey).toBe("excellent-exterior");
  });

  it("flags measurable rain as do-not-paint", () => {
    const result = scorePaintDay({
      precipProbability: 40,
      precipMm: 1.2,
      weatherCode: 61,
      humidity: 55,
      tempF: 72,
      dewPointF: 50,
      windMph: 6,
      minTempNext48hF: 55,
    });
    expect(result.total).toBeLessThan(30);
    expect(result.band).toBe("do-not-paint");
  });

  it("does not veto a dry 40% PoP hour", () => {
    const result = scorePaintDay({
      precipProbability: 40,
      precipMm: 0,
      humidity: 48,
      tempF: 72,
      dewPointF: 52,
      windMph: 6,
      minTempNext48hF: 55,
    });
    expect(result.total).toBeGreaterThan(70);
  });

  it("does not paint a dry marine-layer hour red (Eureka-style)", () => {
    const result = scorePaintDay({
      precipProbability: 15,
      precipMm: 0,
      weatherCode: 3,
      humidity: 94,
      tempF: 58,
      dewPointF: 56,
      windMph: 12,
      gustMph: 18,
      minTempNext48hF: 52,
    });
    expect(result.band).not.toBe("do-not-paint");
    expect(result.total).toBeGreaterThanOrEqual(30);
    expect(result.summaryKey).toMatch(/^risky-/);
  });

  it("does not paint a dry freeze-risk night red", () => {
    const result = scorePaintDay({
      precipProbability: 5,
      precipMm: 0,
      humidity: 48,
      tempF: 52,
      dewPointF: 38,
      windMph: 6,
      minTempNext48hF: 28,
    });
    expect(result.band).not.toBe("do-not-paint");
    expect(result.total).toBeGreaterThanOrEqual(30);
  });

  it("keeps spray-fit low on 20 mph gusts without painting the day red", () => {
    const result = scorePaintDay({
      precipProbability: 5,
      humidity: 48,
      tempF: 72,
      dewPointF: 52,
      windMph: 8,
      gustMph: 20,
      minTempNext48hF: 55,
    });
    const wind = result.factors.find((f) => f.id === "wind");
    expect(wind?.score).toBeLessThanOrEqual(10);
    expect(result.band).not.toBe("do-not-paint");
    expect(result.total).toBeGreaterThan(50);
  });

  it("maps bands correctly", () => {
    expect(bandForScore(90)).toBe("excellent");
    expect(bandForScore(75)).toBe("good");
    expect(bandForScore(55)).toBe("fair");
    expect(bandForScore(40)).toBe("poor");
    expect(bandForScore(10)).toBe("do-not-paint");
  });
});

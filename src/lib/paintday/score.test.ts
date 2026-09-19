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
    expect(scorePrecip(60)).toBeLessThan(10);
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
    expect(scoreFreeze(50)).toBe(100);
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

  it("flags rain as do-not-paint", () => {
    const result = scorePaintDay({
      precipProbability: 80,
      humidity: 90,
      tempF: 68,
      dewPointF: 64,
      windMph: 12,
      minTempNext48hF: 60,
    });
    expect(result.total).toBeLessThan(40);
    expect(result.band === "poor" || result.band === "do-not-paint").toBe(
      true,
    );
    expect(result.summaryKey).toMatch(/rain|do-not-paint/);
  });

  it("maps bands correctly", () => {
    expect(bandForScore(90)).toBe("excellent");
    expect(bandForScore(75)).toBe("good");
    expect(bandForScore(55)).toBe("fair");
    expect(bandForScore(40)).toBe("poor");
    expect(bandForScore(10)).toBe("do-not-paint");
  });
});

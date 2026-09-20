/**
 * PaintDay Score
 * -------------
 * Exterior-first 0–100 score for “is today a smart day to paint?”
 *
 * Weights (must sum to 1):
 *   precipitation  0.25  — rain ruins film and wash-off
 *   humidity       0.20  — high RH slows cure / causes blushing
 *   temperature    0.20  — typical architectural latex window 50–90°F
 *   dew-point      0.15  — surface below dew point = condensation
 *   wind           0.10  — overspray / dry-spray / debris
 *   freeze         0.10  — overnight freeze after application
 *
 * Swap this module only if the product definition of a “paint day” changes.
 * Weather fetching lives in `lib/weather`.
 */

import { isHardPrecip, precipKind } from "./codes";
import type { ProductWindow } from "./product-window";
import { LATEX_WINDOW } from "./product-window";

export const SCORE_WEIGHTS = {
  precip: 0.25,
  humidity: 0.2,
  temperature: 0.2,
  dewPoint: 0.15,
  wind: 0.1,
  freeze: 0.1,
} as const;

export type ScoreBand =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "do-not-paint";

export type ScoreFactorId = keyof typeof SCORE_WEIGHTS;

export type WeatherSnapshot = {
  /** 0–100 chance of precipitation in this hour / window */
  precipProbability: number;
  /** Optional later precip chance, used as a light penalty */
  precipProbability48h?: number;
  /** Liquid equivalent in this hour, mm */
  precipMm?: number;
  /** WMO weather code */
  weatherCode?: number;
  /** Relative humidity 0–100 at typical application hour */
  humidity: number;
  /** Air temperature °F at typical application hour */
  tempF: number;
  /** Dew point °F */
  dewPointF: number;
  /** Sustained wind mph */
  windMph: number;
  /** Wind gusts mph */
  gustMph?: number;
  /** Minimum air temperature in the next 48h °F */
  minTempNext48hF: number;
};

export type FactorScore = {
  id: ScoreFactorId;
  score: number;
  weight: number;
  contribution: number;
};

export type PaintDayScore = {
  total: number;
  band: ScoreBand;
  factors: FactorScore[];
  /** Machine key for i18n summary, e.g. "rain" | "humidity" | "good-exterior" */
  summaryKey: string;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function lerp(x: number, x0: number, x1: number, y0: number, y1: number) {
  if (x1 === x0) return y0;
  const t = clamp((x - x0) / (x1 - x0), 0, 1);
  return y0 + t * (y1 - y0);
}

/** Precipitation: this hour’s water and type. PoP is caution only. */
export function scorePrecip(
  pHour: number,
  _p48 = 0,
  precipMm = 0,
  weatherCode?: number,
): number {
  const kind = precipKind(weatherCode);
  if (kind === "storm" || kind === "snow" || precipMm >= 1) return 0;
  if (precipMm >= 0.2) return 8;
  if (precipMm >= 0.05) return 25;
  const near = clamp(pHour);
  if (near <= 20) return lerp(near, 0, 20, 100, 90);
  if (near <= 50) return lerp(near, 20, 50, 90, 70);
  if (near <= 80) return lerp(near, 50, 80, 70, 45);
  return lerp(near, 80, 100, 45, 25);
}

/** Humidity: 40–70% is film-safe; TDS max is legal, not good. */
export function scoreHumidity(rh: number, window: ProductWindow = LATEX_WINDOW): number {
  const h = clamp(rh);
  const maxH = window.maxHumidityPct;
  if (h >= 40 && h <= 70) return 100;
  if (h < 40) {
    if (h >= 32) return lerp(h, 32, 40, 88, 100);
    if (h >= 20) return lerp(h, 20, 32, 62, 88);
    return lerp(h, 0, 20, 45, 62);
  }
  if (h <= 80) return lerp(h, 70, 80, 100, 72);
  if (h <= maxH) return lerp(h, 80, maxH, 72, 32);
  return clamp(lerp(h, maxH, maxH + 10, 32, 5));
}

/** Temperature vs product window. TDS min is legal (~45), not a 70. */
export function scoreTemperature(
  tempF: number,
  window: ProductWindow = LATEX_WINDOW,
): number {
  const t = tempF;
  const lo = window.minTempF;
  const hi = window.maxTempF;
  const sweetLo = lo + 15;
  const sweetHi = Math.max(sweetLo + 5, hi - 10);
  if (t >= sweetLo && t <= sweetHi) return 100;
  if (t >= lo && t < sweetLo) return lerp(t, lo, sweetLo, 45, 100);
  if (t > sweetHi && t <= hi) return lerp(t, sweetHi, hi, 100, 50);
  if (t >= lo - 5 && t < lo) return lerp(t, lo - 5, lo, 15, 45);
  if (t > hi && t <= hi + 8) return lerp(t, hi, hi + 8, 50, 10);
  if (t < lo - 5) return clamp(lerp(t, lo - 15, lo - 5, 0, 15));
  return clamp(lerp(t, hi + 8, hi + 20, 10, 0));
}

/** Dew-point spread: TDS min is 5°F above dew; 10°F is comfortable. */
export function scoreDewPoint(tempF: number, dewPointF: number): number {
  const spread = tempF - dewPointF;
  if (spread >= 10) return 100;
  if (spread >= 5) return lerp(spread, 5, 10, 50, 100);
  if (spread >= 3) return lerp(spread, 3, 5, 18, 50);
  if (spread >= 0) return lerp(spread, 0, 3, 0, 18);
  return 0;
}

/** Airless spray fit. Effective wind = max(sustained, gust). */
export function scoreWind(windMph: number, gustMph?: number): number {
  const w = Math.max(0, windMph, gustMph ?? 0);
  if (w <= 8) return 100;
  if (w <= 10) return lerp(w, 8, 10, 100, 85);
  if (w <= 12) return lerp(w, 10, 12, 85, 60);
  if (w <= 15) return lerp(w, 12, 15, 60, 30);
  if (w <= 20) return lerp(w, 15, 20, 30, 10);
  if (w <= 25) return lerp(w, 20, 25, 10, 0);
  return 0;
}

export function effectiveWind(windMph: number, gustMph?: number) {
  return Math.max(0, windMph, gustMph ?? 0);
}

/** Overnight min vs product min — 50°F latex should not freeze a wet film. */
export function scoreFreeze(
  minTempNext48hF: number,
  window: ProductWindow = LATEX_WINDOW,
): number {
  const t = minTempNext48hF;
  const lo = window.minTempF;
  if (t >= lo + 5) return 100;
  if (t >= lo) return lerp(t, lo, lo + 5, 75, 100);
  if (t >= lo - 8) return lerp(t, lo - 8, lo, 28, 75);
  if (t >= 32) return lerp(t, 32, lo - 8, 8, 28);
  return clamp(lerp(t, 20, 32, 0, 8));
}

export function bandForScore(total: number): ScoreBand {
  if (total >= 85) return "excellent";
  if (total >= 70) return "good";
  if (total >= 50) return "fair";
  if (total >= 30) return "poor";
  return "do-not-paint";
}

function worstFactor(factors: FactorScore[]): ScoreFactorId {
  return factors.reduce((worst, f) => (f.score < worst.score ? f : worst))
    .id;
}

export function summaryKeyFor(
  total: number,
  factors: FactorScore[],
): string {
  if (total >= 85) return "excellent-exterior";
  if (total >= 70) return "good-exterior";
  const worst = worstFactor(factors);
  if (total < 30) {
    if (worst === "precip") return "do-not-paint-rain";
    if (worst === "freeze") return "do-not-paint-freeze";
    return "do-not-paint";
  }
  switch (worst) {
    case "precip":
      return "risky-rain";
    case "humidity":
      return "risky-humidity";
    case "temperature":
      return "risky-temp";
    case "dewPoint":
      return "risky-dew";
    case "wind":
      return "risky-wind";
    case "freeze":
      return "risky-freeze";
  }
}

export function scorePaintDay(
  input: WeatherSnapshot,
  window: ProductWindow = LATEX_WINDOW,
): PaintDayScore {
  const raw: Record<ScoreFactorId, number> = {
    precip: scorePrecip(
      input.precipProbability,
      input.precipProbability48h,
      input.precipMm,
      input.weatherCode,
    ),
    humidity: scoreHumidity(input.humidity, window),
    temperature: scoreTemperature(input.tempF, window),
    dewPoint: scoreDewPoint(input.tempF, input.dewPointF),
    wind: scoreWind(input.windMph, input.gustMph),
    freeze: scoreFreeze(input.minTempNext48hF, window),
  };

  const factors: FactorScore[] = (
    Object.keys(SCORE_WEIGHTS) as ScoreFactorId[]
  ).map((id) => ({
    id,
    score: Math.round(raw[id]),
    weight: SCORE_WEIGHTS[id],
    contribution: raw[id] * SCORE_WEIGHTS[id],
  }));

  let total = clamp(factors.reduce((sum, f) => sum + f.contribution, 0));

  const mm = input.precipMm ?? 0;
  const spread = input.tempF - input.dewPointF;
  if (isHardPrecip(input.weatherCode, mm) && (precipKind(input.weatherCode) === "storm" || precipKind(input.weatherCode) === "snow" || mm >= 0.2)) {
    total = Math.min(total, 22);
  } else if (mm >= 0.05 && mm < 0.2) {
    total = Math.min(total, 48);
  }
  if (input.humidity > window.maxHumidityPct + 5 || spread < 3) {
    total = Math.min(total, 28);
  } else if (input.humidity > window.maxHumidityPct || spread < 5) {
    total = Math.min(total, 48);
  }
  if (input.minTempNext48hF < 32) total = Math.min(total, 28);
  if (input.tempF < window.minTempF - 2) total = Math.min(total, 35);

  total = Math.round(total);

  return {
    total,
    band: bandForScore(total),
    factors,
    summaryKey: summaryKeyFor(total, factors),
  };
}

export function scoreColor(total: number): string {
  if (total >= 85) return "var(--color-score-excellent)";
  if (total >= 70) return "var(--color-score-good)";
  if (total >= 50) return "var(--color-score-fair)";
  if (total >= 30) return "var(--color-score-poor)";
  return "var(--color-score-bad)";
}

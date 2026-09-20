import { formatClock } from "./crew-plan";
import type { ScoreBand, ScoreFactorId, WeatherSnapshot } from "./score";
import { fToC, type UnitSystem } from "@/lib/units";

export function formatWeekday(isoDate: string, locale: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function fitCall(total: number): "GO" | "WAIT" | "NO" {
  if (total >= 70) return "GO";
  if (total >= 30) return "WAIT";
  return "NO";
}

/** Factor chips: wind/humidity/dew/freeze never print NO. */
export function factorFitCall(id: ScoreFactorId, score: number): "GO" | "WAIT" {
  if (id === "precip") return score >= 70 ? "GO" : "WAIT";
  return score >= 70 ? "GO" : "WAIT";
}

export function windowLine(
  startHour: number | null | undefined,
  wrapHour: number | null | undefined,
  rainHour: number | null | undefined,
): string {
  if (startHour == null || wrapHour == null) {
    return rainHour != null ? `Rain ${formatClock(rainHour)}` : "";
  }
  const paint = `${formatClock(startHour)}–${formatClock(wrapHour)}`;
  if (rainHour != null) return `${paint} · rain ${formatClock(rainHour)}`;
  return paint;
}

export function rainLabel(snap: WeatherSnapshot) {
  const mm = snap.precipMm ?? 0;
  if (mm >= 0.05) return `${mm.toFixed(1)} mm`;
  return `${Math.round(snap.precipProbability)}%`;
}

export function verdictFor(band: ScoreBand): "go" | "caution" | "no" {
  if (band === "excellent" || band === "good") return "go";
  if (band === "do-not-paint") return "no";
  return "caution";
}

/** Hero call: red NO only when this hour is wet. */
export function precipVerdict(
  wet: boolean,
  band: ScoreBand,
): "go" | "caution" | "no" {
  if (wet) return "no";
  if (band === "do-not-paint") return "caution";
  return verdictFor(band);
}

export function formatTemp(tempF: number, units: UnitSystem) {
  return units === "metric" ? `${fToC(tempF)}°C` : `${Math.round(tempF)}°F`;
}

export function formatFactorValue(
  id: ScoreFactorId,
  snap: WeatherSnapshot,
  units: UnitSystem,
): string {
  switch (id) {
    case "precip": {
      const mm = snap.precipMm ?? 0;
      if (mm >= 0.05) return `${mm.toFixed(1)} mm`;
      return `${Math.round(snap.precipProbability)}% chance`;
    }
    case "humidity":
      return `${Math.round(snap.humidity)}% RH`;
    case "temperature":
      return formatTemp(snap.tempF, units);
    case "dewPoint": {
      const spread = snap.tempF - snap.dewPointF;
      return `${Math.round(spread)}°F above dew`;
    }
    case "wind": {
      const gust = snap.gustMph;
      const base =
        units === "metric"
          ? `${Math.round(snap.windMph * 1.609)} km/h`
          : `${Math.round(snap.windMph)} mph`;
      if (gust && gust > snap.windMph + 3) {
        return units === "metric"
          ? `${base} gust ${Math.round(gust * 1.609)}`
          : `${base} gust ${Math.round(gust)}`;
      }
      return base;
    }
    case "freeze":
      return formatTemp(snap.minTempNext48hF, units);
  }
}

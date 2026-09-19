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

export function verdictFor(band: ScoreBand): "go" | "caution" | "no" {
  if (band === "excellent" || band === "good") return "go";
  if (band === "do-not-paint") return "no";
  return "caution";
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
      return `${Math.round(snap.precipProbability)}%`;
    }
    case "humidity":
      return `${Math.round(snap.humidity)}% RH`;
    case "temperature":
      return formatTemp(snap.tempF, units);
    case "dewPoint": {
      const spread = snap.tempF - snap.dewPointF;
      return `${Math.round(spread)}° spread`;
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

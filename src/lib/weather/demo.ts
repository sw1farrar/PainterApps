import { scorePaintDay } from "@/lib/paintday/score";
import type { WeatherSnapshot } from "@/lib/paintday/score";
import { localIsoDate } from "@/lib/paintday/today";
import type { DailyWindow, Forecast, WeatherProvider } from "./types";

function hash(n: number) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

function demoSnapshot(seed: number, dayOffset = 0): WeatherSnapshot {
  const h = hash(seed * 17.3 + dayOffset * 9.1);
  const h2 = hash(seed * 3.7 + dayOffset * 2.4);
  const h3 = hash(seed * 11.1 + dayOffset);
  const tempF = 48 + h * 42;
  const humidity = 30 + h2 * 55;
  const dewSpread = 4 + h3 * 18;
  return {
    precipProbability: Math.round(h * 55),
    precipProbability48h: Math.round(h2 * 50),
    humidity: Math.round(humidity),
    tempF: Math.round(tempF),
    dewPointF: Math.round(tempF - dewSpread),
    windMph: Math.round(3 + h2 * 16),
    minTempNext48hF: Math.round(tempF - 12 - h * 8),
  };
}

export class DemoWeatherProvider implements WeatherProvider {
  async getForecast(
    lat: number,
    lng: number,
    window?: import("@/lib/paintday/product-window").ProductWindow,
  ): Promise<Forecast> {
    const seed = Math.abs(Math.round(lat * 100 + lng * 10));
    const current = demoSnapshot(seed, 0);
    const tz = "America/Denver";
    const days: DailyWindow[] = Array.from({ length: 14 }, (_, i) => {
      const snapshot = demoSnapshot(seed, i);
      const score = scorePaintDay(snapshot, window);
      const open = score.total >= 70 ? 8 : score.total >= 30 ? 4 : 0;
      return {
        date: localIsoDate(tz, new Date(Date.now() + i * 86400000)),
        snapshot,
        score,
        highF: snapshot.tempF,
        precipChance: snapshot.precipProbability,
        startHour: open ? 8 : null,
        wrapHour: open ? 8 + open - 1 : null,
        rainHour: null,
        hoursOpen: open,
        windowPrecipChance: snapshot.precipProbability,
        amScore: score.total,
        pmScore: score.total,
        amWet: false,
        pmWet: false,
        windowHour: 10,
      };
    });
    const today = days[0];
    return {
      source: "demo",
      fetchedAt: new Date().toISOString(),
      timezone: tz,
      current,
      currentScore: today?.score ?? scorePaintDay(current, window),
      hours: [],
      todayHours: [],
      crewPlan: {
        startHour: today?.startHour ?? 8,
        wrapHour: today?.wrapHour ?? 15,
        hoursOpen: today?.hoursOpen ?? 8,
        secondCoat: (today?.hoursOpen ?? 0) >= 4,
        rainHour: null,
      },
      days,
    };
  }
}

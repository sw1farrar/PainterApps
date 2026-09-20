import { scorePaintDay } from "@/lib/paintday/score";
import type { WeatherSnapshot } from "@/lib/paintday/score";
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
  async getForecast(lat: number, lng: number, _window?: unknown): Promise<Forecast> {
    const seed = Math.abs(Math.round(lat * 100 + lng * 10));
    const current = demoSnapshot(seed, 0);
    const start = new Date();
    const days: DailyWindow[] = Array.from({ length: 14 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const snapshot = demoSnapshot(seed, i);
      return {
        date: date.toISOString().slice(0, 10),
        snapshot,
        score: scorePaintDay(snapshot),
        highF: snapshot.tempF,
        precipChance: snapshot.precipProbability,
      };
    });
    return {
      source: "demo",
      fetchedAt: new Date().toISOString(),
      timezone: "America/New_York",
      current,
      currentScore: scorePaintDay(current),
      hours: [],
      todayHours: [],
      crewPlan: {
        startHour: null,
        wrapHour: null,
        hoursOpen: 0,
        secondCoat: false,
        rainHour: null,
      },
      days,
    };
  }
}

import { scorePaintDay } from "@/lib/paintday/score";
import type { WeatherSnapshot } from "@/lib/paintday/score";
import type { DailyWindow, Forecast, WeatherProvider } from "./types";

type OpenMeteoResponse = {
  timezone?: string;
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    dew_point_2m: number[];
    wind_speed_10m: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
};

function pickHourIndex(times: string[], targetHour = 10): number {
  const today = times[0]?.slice(0, 10);
  const idx = times.findIndex((t) => {
    const hour = Number(t.slice(11, 13));
    return t.startsWith(today) && hour === targetHour;
  });
  return idx >= 0 ? idx : 0;
}

function snapshotFromHour(
  data: NonNullable<OpenMeteoResponse["hourly"]>,
  idx: number,
  minTempNext48hF: number,
  precip48?: number,
): WeatherSnapshot {
  return {
    precipProbability: data.precipitation_probability[idx] ?? 0,
    precipProbability48h: precip48,
    humidity: data.relative_humidity_2m[idx] ?? 50,
    tempF: data.temperature_2m[idx] ?? 70,
    dewPointF: data.dew_point_2m[idx] ?? 50,
    windMph: data.wind_speed_10m[idx] ?? 5,
    minTempNext48hF,
  };
}

function minNext48(daily: NonNullable<OpenMeteoResponse["daily"]>, start = 0) {
  const a = daily.temperature_2m_min[start] ?? 50;
  const b = daily.temperature_2m_min[start + 1] ?? a;
  return Math.min(a, b);
}

export class OpenMeteoProvider implements WeatherProvider {
  async getForecast(lat: number, lng: number): Promise<Forecast> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      hourly:
        "temperature_2m,relative_humidity_2m,precipitation_probability,dew_point_2m,wind_speed_10m",
      daily:
        "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      forecast_days: "14",
      timezone: "auto",
    });
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 2700 } },
    );
    if (!res.ok) {
      throw new Error(`Open-Meteo ${res.status}`);
    }
    const json = (await res.json()) as OpenMeteoResponse;
    if (!json.hourly || !json.daily) {
      throw new Error("Open-Meteo missing hourly/daily");
    }

    const hourIdx = pickHourIndex(json.hourly.time);
    const current = snapshotFromHour(
      json.hourly,
      hourIdx,
      minNext48(json.daily, 0),
      json.daily.precipitation_probability_max[1],
    );

    const days: DailyWindow[] = json.daily.time.map((date, i) => {
      const hourForDay = json.hourly!.time.findIndex(
        (t) => t.startsWith(date) && t.slice(11, 13) === "10",
      );
      const idx = hourForDay >= 0 ? hourForDay : Math.min(
        hourIdx + i * 24,
        json.hourly!.time.length - 1,
      );
      const snapshot = snapshotFromHour(
        json.hourly!,
        idx,
        minNext48(json.daily!, i),
        json.daily!.precipitation_probability_max[i + 1],
      );
      snapshot.precipProbability =
        json.daily!.precipitation_probability_max[i] ??
        snapshot.precipProbability;
      snapshot.tempF = json.daily!.temperature_2m_max[i] ?? snapshot.tempF;
      snapshot.windMph = json.daily!.wind_speed_10m_max[i] ?? snapshot.windMph;
      return {
        date,
        snapshot,
        score: scorePaintDay(snapshot),
      };
    });

    const currentScore = scorePaintDay(current);

    return {
      source: "open-meteo",
      fetchedAt: new Date().toISOString(),
      timezone: json.timezone ?? "UTC",
      current,
      currentScore,
      days,
    };
  }
}

import { buildCrewPlan, type HourSlot } from "@/lib/paintday/crew-plan";
import type { ProductWindow } from "@/lib/paintday/product-window";
import { LATEX_WINDOW } from "@/lib/paintday/product-window";
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
    precipitation: number[];
    dew_point_2m: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    weather_code: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
};

const WINDOW_START = 7;
const WINDOW_END = 18;

function clockInTz(tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const month = get("month");
  const day = get("day");
  const year = get("year");
  const hour = Number(get("hour"));
  return { date: `${year}-${month}-${day}`, hour };
}

function minNext48(daily: NonNullable<OpenMeteoResponse["daily"]>, start = 0) {
  const a = daily.temperature_2m_min[start] ?? 50;
  const b = daily.temperature_2m_min[start + 1] ?? a;
  return Math.min(a, b);
}

function snapshotAt(
  hourly: NonNullable<OpenMeteoResponse["hourly"]>,
  i: number,
  minTempNext48hF: number,
  precip48?: number,
): WeatherSnapshot {
  return {
    precipProbability: hourly.precipitation_probability[i] ?? 0,
    precipProbability48h: precip48,
    precipMm: hourly.precipitation?.[i] ?? 0,
    weatherCode: hourly.weather_code?.[i],
    humidity: hourly.relative_humidity_2m[i] ?? 50,
    tempF: hourly.temperature_2m[i] ?? 70,
    dewPointF: hourly.dew_point_2m[i] ?? 50,
    windMph: hourly.wind_speed_10m[i] ?? 5,
    gustMph: hourly.wind_gusts_10m?.[i],
    minTempNext48hF,
  };
}

function dayIndex(times: string[], date: string, hour: number) {
  const exact = times.findIndex(
    (t) => t.startsWith(date) && Number(t.slice(11, 13)) === hour,
  );
  if (exact >= 0) return exact;
  return times.findIndex((t) => t.startsWith(date));
}

export class OpenMeteoProvider implements WeatherProvider {
  async getForecast(
    lat: number,
    lng: number,
    window: ProductWindow = LATEX_WINDOW,
  ): Promise<Forecast> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      hourly: [
        "temperature_2m",
        "relative_humidity_2m",
        "precipitation_probability",
        "precipitation",
        "dew_point_2m",
        "wind_speed_10m",
        "wind_gusts_10m",
        "weather_code",
      ].join(","),
      daily:
        "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "mm",
      forecast_days: "14",
      timezone: "auto",
    });
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { next: { revalidate: 900 } },
    );
    if (!res.ok) {
      throw new Error(`Open-Meteo ${res.status}`);
    }
    const json = (await res.json()) as OpenMeteoResponse;
    if (!json.hourly || !json.daily) {
      throw new Error("Open-Meteo missing hourly/daily");
    }

    const tz = json.timezone ?? "UTC";
    const now = clockInTz(tz);
    const hourly = json.hourly;
    const hours: HourSlot[] = hourly.time.map((time, i) => {
      const date = time.slice(0, 10);
      const hour = Number(time.slice(11, 13));
      const dayIdx = Math.max(0, json.daily!.time.indexOf(date));
      const snapshot = snapshotAt(
        hourly,
        i,
        minNext48(json.daily!, dayIdx),
        json.daily!.precipitation_probability_max[dayIdx + 1],
      );
      return {
        time,
        date,
        hour,
        snapshot,
        score: scorePaintDay(snapshot, window),
      };
    });

    const currentIdx = Math.max(
      0,
      hours.findIndex((h) => h.date === now.date && h.hour === now.hour),
    );
    const current = hours[currentIdx] ?? hours[0];
    const todayHours = hours.filter(
      (h) =>
        h.date === now.date && h.hour >= WINDOW_START && h.hour <= WINDOW_END,
    );
    const crewPlan = buildCrewPlan(todayHours, now.hour);

    const days: DailyWindow[] = json.daily.time.map((date, i) => {
      const idx = dayIndex(hourly.time, date, 10);
      const iSafe = idx >= 0 ? idx : 0;
      const snapshot = snapshotAt(
        hourly,
        iSafe,
        minNext48(json.daily!, i),
        json.daily!.precipitation_probability_max[i + 1],
      );
      const dayHours = hours.filter(
        (h) =>
          h.date === date && h.hour >= WINDOW_START && h.hour <= WINDOW_END,
      );
      const wet = dayHours.reduce(
        (m, h) => Math.max(m, h.snapshot.precipProbability, (h.snapshot.precipMm ?? 0) * 40),
        0,
      );
      const gust = dayHours.reduce(
        (m, h) => Math.max(m, h.snapshot.windMph, h.snapshot.gustMph ?? 0),
        0,
      );
      const rh =
        dayHours.reduce((s, h) => s + h.snapshot.humidity, 0) /
        Math.max(1, dayHours.length);
      snapshot.precipProbability = Math.max(snapshot.precipProbability, wet > 100 ? 100 : wet);
      snapshot.windMph = Math.max(snapshot.windMph, gust);
      snapshot.humidity = rh || snapshot.humidity;
      snapshot.precipMm = dayHours.reduce((s, h) => s + (h.snapshot.precipMm ?? 0), 0);
      const storm = dayHours.find((h) => (h.snapshot.weatherCode ?? 0) >= 95);
      if (storm) snapshot.weatherCode = storm.snapshot.weatherCode;
      return {
        date,
        snapshot,
        score: scorePaintDay(snapshot, window),
      };
    });

    return {
      source: "open-meteo",
      fetchedAt: new Date().toISOString(),
      timezone: tz,
      current: current.snapshot,
      currentScore: current.score,
      hours,
      todayHours,
      crewPlan,
      days,
    };
  }
}

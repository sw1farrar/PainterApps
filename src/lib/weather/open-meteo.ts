import { DAY_END, DAY_START, buildCrewPlan, type HourSlot } from "@/lib/paintday/crew-plan";
import {
  afternoonHalf,
  morningHalf,
  precipDayFields,
  scoreDayFromHours,
} from "@/lib/paintday/day-score";
import type { ProductWindow } from "@/lib/paintday/product-window";
import { LATEX_WINDOW } from "@/lib/paintday/product-window";
import { scorePaintDay } from "@/lib/paintday/score";
import type { WeatherSnapshot } from "@/lib/paintday/score";
import type { DailyWindow, Forecast, WeatherProvider } from "./types";

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
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
): WeatherSnapshot {
  return {
    precipProbability: hourly.precipitation_probability[i] ?? 0,
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

const FORECAST_QUERY = {
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
} as const;

/** One stalled Open-Meteo call must not hold the homepage until the platform kills it. */
const FETCH_TIMEOUT_MS = 12_000;
const FETCH_BUDGET_MS = 45_000;
const FETCH_CONCURRENCY = 3;

let coolUntil = 0;

export function openMeteoAvailable() {
  return Date.now() >= coolUntil;
}

function coolOff(ms: number) {
  coolUntil = Math.max(coolUntil, Date.now() + ms);
}

function openMeteoOrigin() {
  const custom = process.env.OPENMETEO_API_URL?.replace(/\/$/, "");
  if (custom) return custom;
  if (process.env.OPENMETEO_API_KEY) return "https://customer-api.open-meteo.com";
  return "https://api.open-meteo.com";
}

async function fetchOpenMeteo(params: URLSearchParams): Promise<unknown | null> {
  if (!openMeteoAvailable()) return null;
  const key = process.env.OPENMETEO_API_KEY;
  if (key) params.set("apikey", key);
  const url = `${openMeteoOrigin()}/v1/forecast?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after"));
    coolOff(
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 10 * 60 * 1000,
    );
    return null;
  }
  if (!res.ok) return null;
  return res.json();
}

function forecastFromJson(
  json: OpenMeteoResponse,
  window: ProductWindow,
): Forecast {
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
      (h) => h.date === now.date && h.hour >= DAY_START && h.hour <= DAY_END,
    );
    const crewPlan = buildCrewPlan(todayHours, now.hour, window);

    const days: DailyWindow[] = json.daily.time.map((date, i) => {
      const dayHours = hours.filter(
        (h) => h.date === date && h.hour >= DAY_START && h.hour <= DAY_END,
      );
      const day = scoreDayFromHours(dayHours, window);
      const am = morningHalf(dayHours, window);
      const pm = afternoonHalf(dayHours, window);
      const precip = precipDayFields(
        dayHours,
        am,
        pm,
        day.crewPlan.rainHour,
      );
      const blockPoP = day.block.length
        ? Math.round(
            Math.max(
              ...day.block.map((h) => h.snapshot.precipProbability ?? 0),
            ),
          )
        : Math.round(json.daily!.precipitation_probability_max[i] ?? 0);
      return {
        date,
        snapshot: day.snapshot,
        score: day.score,
        highF: json.daily!.temperature_2m_max[i],
        precipChance: blockPoP,
        startHour: day.crewPlan.startHour,
        wrapHour: day.crewPlan.wrapHour,
        rainHour: day.crewPlan.rainHour,
        hoursOpen: day.crewPlan.hoursOpen,
        windowPrecipChance: blockPoP,
        amScore: am.score,
        pmScore: pm.score,
        amWet: precip.amWet,
        pmWet: precip.pmWet,
        amRainedOut: precip.amRainedOut,
        pmRainedOut: precip.pmRainedOut,
        rainMm: precip.rainMm,
        pmRainHour: precip.pmRainHour,
        pmRainMm: precip.pmRainMm,
        windowHour: day.representativeHour,
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

export class OpenMeteoProvider implements WeatherProvider {
  async getForecast(
    lat: number,
    lng: number,
    window: ProductWindow = LATEX_WINDOW,
  ): Promise<Forecast | null> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      ...FORECAST_QUERY,
    });
    const json = (await fetchOpenMeteo(params)) as OpenMeteoResponse | null;
    if (!json) return null;
    return forecastFromJson(json, window);
  }

  async getForecastMany(
    points: Array<{ lat: number; lng: number }>,
    window: ProductWindow = LATEX_WINDOW,
    chunkSize = 20,
  ): Promise<Array<Forecast | null>> {
    const out: Array<Forecast | null> = Array(points.length).fill(null);
    if (!openMeteoAvailable() || points.length === 0) return out;
    const chunks: Array<{ index: number; points: typeof points }> = [];
    for (let i = 0; i < points.length; i += chunkSize) {
      chunks.push({ index: i, points: points.slice(i, i + chunkSize) });
    }
    const started = Date.now();
    let cursor = 0;
    let stop = false;

    const fill = (offset: number, chunk: typeof points, json: unknown) => {
      const rows = Array.isArray(json)
        ? (json as OpenMeteoResponse[])
        : [json as OpenMeteoResponse];
      if (rows.length === chunk.length) {
        rows.forEach((row, j) => {
          try {
            out[offset + j] = forecastFromJson(row, window);
          } catch {
            out[offset + j] = null;
          }
        });
        return;
      }
      const used = new Set<number>();
      chunk.forEach((point, j) => {
        let best = -1;
        let bestD = Infinity;
        rows.forEach((row, ri) => {
          if (used.has(ri)) return;
          if (row.latitude == null || row.longitude == null) return;
          const d = Math.hypot(row.latitude - point.lat, row.longitude - point.lng);
          if (d < bestD) {
            bestD = d;
            best = ri;
          }
        });
        if (best < 0 || bestD > 1) return;
        used.add(best);
        try {
          out[offset + j] = forecastFromJson(rows[best], window);
        } catch {
          out[offset + j] = null;
        }
      });
    };

    const worker = async () => {
      while (!stop && Date.now() - started < FETCH_BUDGET_MS) {
        if (!openMeteoAvailable()) {
          stop = true;
          return;
        }
        const mine = cursor++;
        const chunk = chunks[mine];
        if (!chunk) return;
        const params = new URLSearchParams({
          latitude: chunk.points.map((p) => p.lat).join(","),
          longitude: chunk.points.map((p) => p.lng).join(","),
          ...FORECAST_QUERY,
        });
        const json = await fetchOpenMeteo(params);
        if (!json) {
          if (!openMeteoAvailable()) stop = true;
          continue;
        }
        fill(chunk.index, chunk.points, json);
      }
    };

    const workers = Math.min(FETCH_CONCURRENCY, chunks.length);
    await Promise.all(Array.from({ length: workers }, () => worker()));
    return out;
  }
}

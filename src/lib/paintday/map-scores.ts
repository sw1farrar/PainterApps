import { unstable_cache } from "next/cache";
import { METROS } from "@/data/geo/metros";
import { DemoWeatherProvider } from "@/lib/weather/demo";
import { fetchForecastMany } from "@/lib/weather";
import {
  WEATHER_REVALIDATE_SECONDS,
  weatherCacheBucket,
} from "@/lib/weather/cache";

export const RAIN_RED = "#ef4444";

export function scoreColorHex(score: number) {
  if (score >= 85) return "#10b981";
  if (score >= 70) return "#14b8a6";
  if (score >= 50) return "#eab308";
  if (score >= 30) return "#f97316";
  return RAIN_RED;
}

/** Map glyph: soaking AM rain = solid red. AM drizzle + dry PM = split. AM dry + PM rain = split. */
export function mapDotColors(point: {
  amWet?: boolean;
  pmWet?: boolean;
  amScore?: number;
  pmScore?: number;
  score: number;
  hoursOpen?: number;
}) {
  const hoursOpen = point.hoursOpen ?? 0;
  if (point.amWet && point.pmWet) {
    return { left: RAIN_RED, right: RAIN_RED, split: false };
  }
  if (point.amWet && hoursOpen === 0) {
    return { left: RAIN_RED, right: RAIN_RED, split: false };
  }
  if (point.amWet) {
    return {
      left: RAIN_RED,
      right: scoreColorHex(point.pmScore || point.score),
      split: true,
    };
  }
  if (point.pmWet) {
    return {
      left: scoreColorHex(point.amScore || point.score),
      right: RAIN_RED,
      split: true,
    };
  }
  const c = scoreColorHex(point.score);
  return { left: c, right: c, split: false };
}

export type MapScorePoint = {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  score: number;
  band: string;
  summaryKey: string;
  live: boolean;
  highF: number;
  precipChance: number;
  startHour: number | null;
  wrapHour: number | null;
  rainHour: number | null;
  hoursOpen: number;
  amScore: number;
  pmScore: number;
  amWet: boolean;
  pmWet: boolean;
};

export type MapMetro = {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  live: boolean;
  dates: string[];
  scores: number[];
  bands: string[];
  summaryKeys: string[];
  highs: number[];
  precip: number[];
  startHours: Array<number | null>;
  wrapHours: Array<number | null>;
  rainHours: Array<number | null>;
  hoursOpen: number[];
  amScores: number[];
  pmScores: number[];
  amWet: boolean[];
  pmWet: boolean[];
};

export type MapBoard = {
  dates: string[];
  metros: MapMetro[];
};

function calendarDays(count: number, tz = "America/Los_Angeles") {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(start + i * 86400000);
    return dt.toISOString().slice(0, 10);
  });
}

function pickDay<T>(
  metroDates: string[],
  values: T[],
  date: string,
  fallback: T,
): T {
  const i = metroDates.indexOf(date);
  if (i >= 0 && values[i] !== undefined) return values[i];
  return values[0] ?? fallback;
}

async function loadMapBoard(): Promise<MapBoard> {
  const dates = calendarDays(14);
  const forecasts = await fetchForecastMany(
    METROS.map((m) => ({ lat: m.lat, lng: m.lng })),
  );
  const demo = new DemoWeatherProvider();
  const rows = await Promise.all(
    METROS.map(async (m, i) => {
      const forecast =
        forecasts[i] && forecasts[i]!.source === "open-meteo"
          ? forecasts[i]!
          : await demo.getForecast(m.lat, m.lng);
      const days = forecast.days.slice(0, 14);
      return {
        zip: m.zip,
        city: m.city,
        state: m.state,
        lat: m.lat,
        lng: m.lng,
        live: forecast.source === "open-meteo",
        dates: days.map((d) => d.date),
        scores: days.map((d) => d.score.total),
        bands: days.map((d) => d.score.band),
        summaryKeys: days.map((d) => d.score.summaryKey),
        highs: days.map((d) => Math.round(d.highF ?? d.snapshot.tempF)),
        precip: days.map((d) =>
          Math.round(d.windowPrecipChance ?? d.precipChance ?? 0),
        ),
        startHours: days.map((d) => d.startHour ?? null),
        wrapHours: days.map((d) => d.wrapHour ?? null),
        rainHours: days.map((d) => d.rainHour ?? null),
        hoursOpen: days.map((d) => d.hoursOpen ?? 0),
        amScores: days.map((d) => d.amScore ?? d.score.total),
        pmScores: days.map((d) => d.pmScore ?? d.score.total),
        amWet: days.map((d) => Boolean(d.amWet)),
        pmWet: days.map((d) => Boolean(d.pmWet)),
      } satisfies MapMetro;
    }),
  );
  return { dates, metros: rows };
}

const loadMapBoardCached = unstable_cache(
  async (_bucket: number) => loadMapBoard(),
  ["paintday-map-v5"],
  { revalidate: WEATHER_REVALIDATE_SECONDS },
);

export async function getMapBoard() {
  return loadMapBoardCached(weatherCacheBucket());
}

export async function getMapScores(): Promise<MapScorePoint[]> {
  const board = await getMapBoard();
  return pointsForDay(board, 0);
}

export function pointsForDay(board: MapBoard, day: number): MapScorePoint[] {
  const i = Math.min(Math.max(day, 0), board.dates.length - 1);
  const date = board.dates[i];
  return board.metros.map((m) => ({
    zip: m.zip,
    city: m.city,
    state: m.state,
    lat: m.lat,
    lng: m.lng,
    live: m.live,
    score: pickDay(m.dates, m.scores, date, 0),
    band: pickDay(m.dates, m.bands, date, "fair"),
    summaryKey: pickDay(m.dates, m.summaryKeys, date, ""),
    highF: pickDay(m.dates, m.highs, date, 0),
    precipChance: pickDay(m.dates, m.precip, date, 0),
    startHour: pickDay(m.dates, m.startHours, date, null),
    wrapHour: pickDay(m.dates, m.wrapHours, date, null),
    rainHour: pickDay(m.dates, m.rainHours, date, null),
    hoursOpen: pickDay(m.dates, m.hoursOpen, date, 0),
    amScore: pickDay(m.dates, m.amScores, date, 0),
    pmScore: pickDay(m.dates, m.pmScores, date, 0),
    amWet: pickDay(m.dates, m.amWet, date, false),
    pmWet: pickDay(m.dates, m.pmWet, date, false),
  }));
}

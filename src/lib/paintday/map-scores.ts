import { METROS } from "@/data/geo/metros";
import { fetchForecast } from "@/lib/weather";

export type MapScorePoint = {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  score: number;
  band: string;
  live: boolean;
  highF: number;
  precipChance: number;
};

export type MapMetro = {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  live: boolean;
  scores: number[];
  bands: string[];
  highs: number[];
  precip: number[];
};

export type MapBoard = {
  dates: string[];
  metros: MapMetro[];
};

function calendarDays(count: number, tz = "America/Chicago") {
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

export async function getMapBoard(): Promise<MapBoard> {
  const dates = calendarDays(14);
  const metros = await Promise.all(
    METROS.map(async (m) => {
      const forecast = await fetchForecast(m.lat, m.lng);
      const days = forecast.days.slice(0, 14);
      return {
        zip: m.zip,
        city: m.city,
        state: m.state,
        lat: m.lat,
        lng: m.lng,
        live: forecast.source === "open-meteo",
        scores: days.map((d) => d.score.total),
        bands: days.map((d) => d.score.band),
        highs: days.map((d) => Math.round(d.highF ?? d.snapshot.tempF)),
        precip: days.map((d) =>
          Math.round(d.precipChance ?? d.snapshot.precipProbability),
        ),
      };
    }),
  );
  return { dates, metros };
}

export async function getMapScores(): Promise<MapScorePoint[]> {
  const board = await getMapBoard();
  return pointsForDay(board, 0);
}

export function pointsForDay(board: MapBoard, day: number): MapScorePoint[] {
  const i = Math.min(Math.max(day, 0), board.dates.length - 1);
  return board.metros.map((m) => ({
    zip: m.zip,
    city: m.city,
    state: m.state,
    lat: m.lat,
    lng: m.lng,
    live: m.live,
    score: m.scores[i] ?? m.scores[0] ?? 0,
    band: m.bands[i] ?? m.bands[0] ?? "fair",
    highF: m.highs[i] ?? m.highs[0] ?? 0,
    precipChance: m.precip[i] ?? m.precip[0] ?? 0,
  }));
}

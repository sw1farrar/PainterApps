import type { PaintDayScore, WeatherSnapshot } from "@/lib/paintday/score";

export type DailyWindow = {
  date: string;
  snapshot: WeatherSnapshot;
  score: PaintDayScore;
};

export type Forecast = {
  source: "open-meteo" | "demo";
  fetchedAt: string;
  timezone: string;
  current: WeatherSnapshot;
  currentScore: PaintDayScore;
  days: DailyWindow[];
};

export type GeoPlace = {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  label: string;
};

export interface WeatherProvider {
  getForecast(lat: number, lng: number): Promise<Forecast>;
}

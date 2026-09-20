import type { CrewPlan, HourSlot } from "@/lib/paintday/crew-plan";
import type { PaintDayScore, WeatherSnapshot } from "@/lib/paintday/score";

export type DailyWindow = {
  date: string;
  snapshot: WeatherSnapshot;
  score: PaintDayScore;
  highF?: number;
  precipChance?: number;
  startHour?: number | null;
  wrapHour?: number | null;
  rainHour?: number | null;
  hoursOpen?: number;
  windowPrecipChance?: number;
  amScore?: number;
  pmScore?: number;
  amWet?: boolean;
  pmWet?: boolean;
};

export type Forecast = {
  source: "open-meteo" | "nws" | "demo";
  fetchedAt: string;
  timezone: string;
  current: WeatherSnapshot;
  currentScore: PaintDayScore;
  hours: HourSlot[];
  todayHours: HourSlot[];
  crewPlan: CrewPlan;
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
  getForecast(
    lat: number,
    lng: number,
    window?: import("@/lib/paintday/product-window").ProductWindow,
  ): Promise<Forecast | null>;
}

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
};

export async function getMapScores(): Promise<MapScorePoint[]> {
  const points = await Promise.all(
    METROS.map(async (m) => {
      const forecast = await fetchForecast(m.lat, m.lng);
      return {
        zip: m.zip,
        city: m.city,
        state: m.state,
        lat: m.lat,
        lng: m.lng,
        score: forecast.currentScore.total,
        band: forecast.currentScore.band,
        live: forecast.source === "open-meteo",
      };
    }),
  );
  return points;
}

import { DemoWeatherProvider } from "./demo";
import { OpenMeteoProvider } from "./open-meteo";
import type { Forecast, WeatherProvider } from "./types";

export type { Forecast, GeoPlace, WeatherProvider } from "./types";

let cached: WeatherProvider | null = null;

export function getWeatherProvider(): WeatherProvider {
  if (cached) return cached;
  cached = new OpenMeteoProvider();
  return cached;
}

export async function fetchForecast(
  lat: number,
  lng: number,
): Promise<Forecast> {
  try {
    return await getWeatherProvider().getForecast(lat, lng);
  } catch {
    return new DemoWeatherProvider().getForecast(lat, lng);
  }
}

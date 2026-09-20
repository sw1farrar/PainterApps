import type { ProductWindow } from "@/lib/paintday/product-window";
import { DemoWeatherProvider } from "./demo";
import { getNwsForecast } from "./nws";
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
  window?: ProductWindow,
): Promise<Forecast> {
  const om = await getWeatherProvider().getForecast(lat, lng, window);
  if (om) return om;
  try {
    return await getNwsForecast(lat, lng, window);
  } catch {
    // NWS can fail; fall through to stand-in data.
  }
  return new DemoWeatherProvider().getForecast(lat, lng, window);
}

export async function fetchForecastMany(
  points: Array<{ lat: number; lng: number }>,
  window?: ProductWindow,
): Promise<Array<Forecast | null>> {
  const provider = getWeatherProvider();
  if (provider instanceof OpenMeteoProvider) {
    return provider.getForecastMany(points, window);
  }
  return Promise.all(
    points.map((p) =>
      fetchForecast(p.lat, p.lng, window).then((f) =>
        f.source === "open-meteo" ? f : null,
      ),
    ),
  );
}

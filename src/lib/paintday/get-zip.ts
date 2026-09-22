import { unstable_cache } from "next/cache";
import { geocodeZip } from "@/lib/geo/geocode";
import type { ProductWindow } from "@/lib/paintday/product-window";
import { fetchForecast } from "@/lib/weather";
import {
  WEATHER_REVALIDATE_SECONDS,
  weatherCacheBucket,
} from "@/lib/weather/cache";
import { DemoWeatherProvider } from "@/lib/weather/demo";
import type { Forecast, GeoPlace } from "@/lib/weather/types";

export type ZipPaintDay = {
  place: GeoPlace;
  forecast: Forecast;
};

async function loadLiveZip(zip: string): Promise<ZipPaintDay | null> {
  const place = await geocodeZip(zip);
  if (!place) return null;
  try {
    const forecast = await fetchForecast(place.lat, place.lng);
    if (forecast.source === "demo") return null;
    return { place, forecast };
  } catch {
    return null;
  }
}

const getLiveZipCached = unstable_cache(
  async (zip: string, _bucket: number) => loadLiveZip(zip),
  ["paintday-zip-v13"],
  { revalidate: WEATHER_REVALIDATE_SECONDS },
);

export async function getZipPaintDay(
  zip: string,
  window?: ProductWindow,
): Promise<ZipPaintDay | null> {
  const place = await geocodeZip(zip);
  if (!place) return null;
  try {
    if (window?.name && window.name !== "Architectural latex") {
      const forecast = await fetchForecast(place.lat, place.lng, window);
      if (forecast.source !== "demo") return { place, forecast };
    } else {
      const live = await getLiveZipCached(zip, weatherCacheBucket());
      if (live) return live;
    }
  } catch (error) {
    console.error("PaintDay live forecast failed", error);
  }
  return {
    place,
    forecast: await new DemoWeatherProvider().getForecast(place.lat, place.lng),
  };
}

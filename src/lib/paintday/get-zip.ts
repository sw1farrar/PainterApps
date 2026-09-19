import { unstable_cache } from "next/cache";
import { geocodeZip } from "@/lib/geo/geocode";
import { fetchForecast } from "@/lib/weather";
import type { Forecast, GeoPlace } from "@/lib/weather/types";

export type ZipPaintDay = {
  place: GeoPlace;
  forecast: Forecast;
};

async function loadZipUncached(zip: string): Promise<ZipPaintDay | null> {
  const place = await geocodeZip(zip);
  if (!place) return null;
  const forecast = await fetchForecast(place.lat, place.lng);
  return { place, forecast };
}

export const getZipPaintDay = unstable_cache(
  loadZipUncached,
  ["paintday-zip"],
  { revalidate: 2700 },
);

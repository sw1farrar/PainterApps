import { unstable_cache } from "next/cache";
import { geocodeZip } from "@/lib/geo/geocode";
import type { ProductWindow } from "@/lib/paintday/product-window";
import { DemoWeatherProvider } from "@/lib/weather/demo";
import { getWeatherProvider } from "@/lib/weather";
import type { Forecast, GeoPlace } from "@/lib/weather/types";

export type ZipPaintDay = {
  place: GeoPlace;
  forecast: Forecast;
};

async function loadLiveZip(zip: string): Promise<ZipPaintDay | null> {
  const place = await geocodeZip(zip);
  if (!place) return null;
  const forecast = await getWeatherProvider().getForecast(place.lat, place.lng);
  if (forecast.source === "demo") return null;
  return { place, forecast };
}

const getLiveZipCached = unstable_cache(loadLiveZip, ["paintday-zip-v2"], {
  revalidate: 900,
});

export async function getZipPaintDay(
  zip: string,
  window?: ProductWindow,
): Promise<ZipPaintDay | null> {
  const place = await geocodeZip(zip);
  if (!place) return null;
  try {
    if (window?.name && window.name !== "Architectural latex") {
      const forecast = await getWeatherProvider().getForecast(
        place.lat,
        place.lng,
        window,
      );
      if (forecast.source !== "demo") return { place, forecast };
    } else {
      const live = await getLiveZipCached(zip);
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

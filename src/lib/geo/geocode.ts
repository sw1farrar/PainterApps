import { METROS, type Metro } from "@/data/geo/metros";
import { isUsZip } from "@/lib/utils";
import type { GeoPlace } from "@/lib/weather/types";
import { matchMetros, mergePlaces } from "./match-metros";

function toPlace(m: Pick<Metro, "zip" | "city" | "state" | "lat" | "lng">): GeoPlace {
  return {
    zip: m.zip,
    city: m.city,
    state: m.state,
    lat: m.lat,
    lng: m.lng,
    label: `${m.city}, ${m.state} ${m.zip}`,
  };
}

type Zippopotam = {
  "post code": string;
  country: string;
  places?: Array<{
    "place name": string;
    state: string;
    "state abbreviation": string;
    latitude: string;
    longitude: string;
  }>;
};

export async function geocodeZip(zip: string): Promise<GeoPlace | null> {
  const clean = zip.trim();
  if (!isUsZip(clean)) return null;

  const known = METROS.find((m) => m.zip === clean);
  if (known) return toPlace(known);

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${clean}`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Zippopotam;
    const place = json.places?.[0];
    if (!place) return null;
    return {
      zip: clean,
      city: place["place name"],
      state: place["state abbreviation"],
      lat: Number(place.latitude),
      lng: Number(place.longitude),
      label: `${place["place name"]}, ${place["state abbreviation"]} ${clean}`,
    };
  } catch {
    return null;
  }
}

export async function searchPlaces(query: string): Promise<GeoPlace[]> {
  const q = query.trim();
  if (!q) return [];
  if (isUsZip(q)) {
    const place = await geocodeZip(q);
    return place ? [place] : [];
  }

  const local = matchMetros(q, 8);

  try {
    const params = new URLSearchParams({
      name: q,
      count: "8",
      country: "US",
      format: "json",
    });
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return local;
    const json = (await res.json()) as {
      results?: Array<{
        name: string;
        admin1?: string;
        latitude: number;
        longitude: number;
        postcodes?: string[];
      }>;
    };
    const remote: GeoPlace[] = (json.results ?? []).map((r) => {
      const zip = r.postcodes?.[0] ?? "";
      const state = r.admin1 ?? "";
      return {
        zip,
        city: r.name,
        state,
        lat: r.latitude,
        lng: r.longitude,
        label: zip ? `${r.name}, ${state} ${zip}` : `${r.name}, ${state}`,
      };
    });
    return mergePlaces(local, remote.filter((p) => isUsZip(p.zip)), 8);
  } catch {
    return local;
  }
}

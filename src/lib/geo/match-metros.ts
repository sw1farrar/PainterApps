import { METROS } from "@/data/geo/metros";
import type { GeoPlace } from "@/lib/weather/types";

function toPlace(m: (typeof METROS)[number]): GeoPlace {
  return {
    zip: m.zip,
    city: m.city,
    state: m.state,
    lat: m.lat,
    lng: m.lng,
    label: `${m.city}, ${m.state} ${m.zip}`,
  };
}

export function matchMetros(query: string, limit = 8): GeoPlace[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const digits = q.replace(/\D/g, "");
  const ranked = METROS.map((m) => {
    const city = m.city.toLowerCase();
    const state = m.state.toLowerCase();
    const zip = m.zip;
    let score = 0;
    if (digits && zip.startsWith(digits)) score += 120 - digits.length;
    if (city.startsWith(q)) score += 90;
    else if (city.split(/\s+/).some((w) => w.startsWith(q))) score += 70;
    else if (city.includes(q)) score += 40;
    if (state === q || state.startsWith(q)) score += 25;
    return { place: toPlace(m), score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.place.city.localeCompare(b.place.city));
  const seen = new Set<string>();
  const out: GeoPlace[] = [];
  for (const row of ranked) {
    if (seen.has(row.place.zip)) continue;
    seen.add(row.place.zip);
    out.push(row.place);
    if (out.length >= limit) break;
  }
  return out;
}

export function mergePlaces(primary: GeoPlace[], extra: GeoPlace[], limit = 8) {
  const seen = new Set<string>();
  const out: GeoPlace[] = [];
  for (const p of [...primary, ...extra]) {
    const key = p.zip || `${p.lat},${p.lng}`;
    if (seen.has(key)) continue;
    if (!p.zip && extra === primary) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

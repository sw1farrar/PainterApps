/**
 * Albers USA composite (CONUS + Alaska + Hawaii insets).
 * Land rings come from a simplified country GeoJSON, not a hand-drawn path.
 */

import usa from "@/data/geo/usa.geo.json";

const DEG = Math.PI / 180;

type AlbersParams = {
  lat1: number;
  lat2: number;
  lat0: number;
  lng0: number;
};

type BBox = { minX: number; minY: number; maxX: number; maxY: number };
type LngLat = [number, number];

export type SvgPoint = { x: number; y: number; region: "conus" | "ak" | "hi" };

const CONUS: AlbersParams = { lat1: 29.5, lat2: 45.5, lat0: 37.5, lng0: -96 };
const AK: AlbersParams = { lat1: 55, lat2: 65, lat0: 50, lng0: -154 };
const HI: AlbersParams = { lat1: 8, lat2: 18, lat0: 13, lng0: -157 };

function albers(lat: number, lng: number, p: AlbersParams) {
  const φ1 = p.lat1 * DEG;
  const φ2 = p.lat2 * DEG;
  const φ0 = p.lat0 * DEG;
  const λ0 = p.lng0 * DEG;
  const φ = lat * DEG;
  const λ = lng * DEG;
  const n = (Math.sin(φ1) + Math.sin(φ2)) / 2;
  const C = Math.cos(φ1) ** 2 + 2 * n * Math.sin(φ1);
  const ρ0 = Math.sqrt(Math.max(0, C - 2 * n * Math.sin(φ0))) / n;
  const ρ = Math.sqrt(Math.max(0, C - 2 * n * Math.sin(φ))) / n;
  const θ = n * (λ - λ0);
  return { x: ρ * Math.sin(θ), y: ρ0 - ρ * Math.cos(θ) };
}

function fit(
  pt: { x: number; y: number },
  box: BBox,
  dest: BBox,
): { x: number; y: number } {
  const dx = box.maxX - box.minX || 1;
  const dy = box.maxY - box.minY || 1;
  return {
    x: dest.minX + ((pt.x - box.minX) / dx) * (dest.maxX - dest.minX),
    y: dest.maxY - ((pt.y - box.minY) / dy) * (dest.maxY - dest.minY),
  };
}

function bboxOf(points: { x: number; y: number }[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const padX = (maxX - minX) * 0.03;
  const padY = (maxY - minY) * 0.03;
  return {
    minX: minX - padX,
    minY: minY - padY,
    maxX: maxX + padX,
    maxY: maxY + padY,
  };
}

function classify(lng: number, lat: number): SvgPoint["region"] {
  if (lat < 28 && lng < -154) return "hi";
  if (lng < -129 && lat > 50) return "ak";
  if (lng < -140) return "ak";
  return "conus";
}

function paramsFor(region: SvgPoint["region"]) {
  if (region === "ak") return AK;
  if (region === "hi") return HI;
  return CONUS;
}

function extractRings(): { region: SvgPoint["region"]; ring: LngLat[] }[] {
  const feature = (
    usa as unknown as {
      features: { geometry: { coordinates: LngLat[][][] } }[];
    }
  ).features[0];
  const coords = feature.geometry.coordinates;
  const out: { region: SvgPoint["region"]; ring: LngLat[] }[] = [];
  for (const polygon of coords) {
    const outer = polygon[0];
    if (!outer?.length) continue;
    const [lng, lat] = outer[0];
    out.push({ region: classify(lng, lat), ring: outer });
  }
  return out;
}

const RINGS = extractRings();

const CONUS_RAW = RINGS.filter((r) => r.region === "conus").flatMap((r) =>
  r.ring.map(([lng, lat]) => albers(lat, lng, CONUS)),
);
const AK_RAW = RINGS.filter((r) => r.region === "ak").flatMap((r) =>
  r.ring.map(([lng, lat]) => albers(lat, lng, AK)),
);
const HI_RAW = RINGS.filter((r) => r.region === "hi").flatMap((r) =>
  r.ring.map(([lng, lat]) => albers(lat, lng, HI)),
);

const CONUS_BOX = bboxOf(CONUS_RAW);
const AK_BOX = bboxOf(AK_RAW);
const HI_BOX = bboxOf(HI_RAW);

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 580;

const CONUS_DEST: BBox = { minX: 36, minY: 16, maxX: 928, maxY: 452 };
const AK_DEST: BBox = { minX: 36, minY: 458, maxX: 250, maxY: 568 };
const HI_DEST: BBox = { minX: 268, minY: 488, maxX: 410, maxY: 568 };

function destFor(region: SvgPoint["region"]) {
  if (region === "ak") return AK_DEST;
  if (region === "hi") return HI_DEST;
  return CONUS_DEST;
}

function boxFor(region: SvgPoint["region"]) {
  if (region === "ak") return AK_BOX;
  if (region === "hi") return HI_BOX;
  return CONUS_BOX;
}

export function regionFor(lat: number, lng: number): SvgPoint["region"] {
  return classify(lng, lat);
}

export function projectUsa(lat: number, lng: number): SvgPoint {
  const region = classify(lng, lat);
  const p = fit(
    albers(lat, lng, paramsFor(region)),
    boxFor(region),
    destFor(region),
  );
  return { ...p, region };
}

function pathFor(
  ring: LngLat[],
  region: SvgPoint["region"],
) {
  const params = paramsFor(region);
  const box = boxFor(region);
  const dest = destFor(region);
  return (
    ring
      .map(([lng, lat], i) => {
        const p = fit(albers(lat, lng, params), box, dest);
        return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      })
      .join(" ") + " Z"
  );
}

export const LAND_PATHS = RINGS.map((r) => pathFor(r.ring, r.region));

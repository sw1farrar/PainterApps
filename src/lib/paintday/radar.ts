export function weatherBugRadarUrl(city: string, state: string, zip: string) {
  const slug = city
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const st = state.toLowerCase().replace(/[^a-z]/g, "");
  return `https://www.weatherbug.com/maps/${slug}-${st}-${zip}?layerId=radar`;
}

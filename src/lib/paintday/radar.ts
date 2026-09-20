/** WeatherBug resolves a US ZIP to its canonical city page. */
function weatherBugZip(zip: string) {
  return zip.replace(/\D/g, "").slice(0, 5);
}

export function weatherBugRadarUrl(zip: string) {
  return `https://www.weatherbug.com/maps/${weatherBugZip(zip)}?layerId=radar`;
}

export function weatherBugDetailsUrl(zip: string) {
  return `https://www.weatherbug.com/weather-forecast/now/${weatherBugZip(zip)}`;
}

export function weatherBugHourlyUrl(zip: string) {
  return `https://www.weatherbug.com/weather-forecast/hourly/${weatherBugZip(zip)}`;
}

export function weatherBugTenDayUrl(zip: string) {
  return `https://www.weatherbug.com/weather-forecast/10-day-weather/${weatherBugZip(zip)}`;
}

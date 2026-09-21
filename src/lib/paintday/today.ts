import type { DailyWindow, Forecast } from "@/lib/weather/types";

export function localIsoDate(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function forecastDayForNow(forecast: Forecast): DailyWindow | undefined {
  const iso = localIsoDate(forecast.timezone);
  return forecast.days.find((d) => d.date === iso) ?? forecast.days[0];
}

/** Soaking AM rain with no remaining window. Light AM drizzle with hoursOpen > 0 stays open. */
export function dayIsClosed(
  day?: { amWet?: boolean; hoursOpen?: number } | null,
) {
  return Boolean(day?.amWet) && (day?.hoursOpen ?? 0) === 0;
}

/** Morning drizzle (wet AM hour) with a dry afternoon paint window. */
export function afternoonOpenAfterDrizzle(
  day?: { amWet?: boolean; pmWet?: boolean; hoursOpen?: number } | null,
) {
  return Boolean(day?.amWet) && !day?.pmWet && (day?.hoursOpen ?? 0) > 0;
}

export const AM_RAIN_CLOSED_CAP = 22;
/** Orange WAIT — morning drizzle is not a green GO day. */
export const DRIZZLE_CAUTION_CAP = 40;

type DayScoreInput = {
  amWet?: boolean;
  pmWet?: boolean;
  hoursOpen?: number;
  score?: { total: number };
} | null;

/** Displayed day-fit: closed rain stays red, AM drizzle is capped orange. */
export function dayDisplayTotal(day?: DayScoreInput) {
  const total = day?.score?.total;
  if (total == null) return null;
  if (dayIsClosed(day)) return Math.min(total, AM_RAIN_CLOSED_CAP);
  if (afternoonOpenAfterDrizzle(day)) return Math.min(total, DRIZZLE_CAUTION_CAP);
  return total;
}

/** Day-fit total used on the map, ZIP hero, and portal — soaking AM rain closes the day. */
export function dayFitTotal(forecast: Forecast) {
  const day = forecastDayForNow(forecast);
  if (!day) return null;
  return dayDisplayTotal(day);
}

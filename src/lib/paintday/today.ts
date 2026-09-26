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

/** Morning rain and no hours left. A later dry window stays open. */
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

/** The work window starts after precip has already fallen. */
export function windowStartsAfterRain(
  day?: {
    rainHour?: number | null;
    startHour?: number | null;
    hoursOpen?: number;
  } | null,
) {
  return (
    day?.rainHour != null &&
    day.startHour != null &&
    day.rainHour < day.startHour &&
    (day.hoursOpen ?? 0) > 0
  );
}

/** Morning water was real rain (soaked the half or ≥1 mm), not light drizzle. */
export function morningWasSoaking(
  day?: { amRainedOut?: boolean; rainMm?: number | null } | null,
) {
  return Boolean(day?.amRainedOut) || (day?.rainMm ?? 0) >= 1;
}

export const AM_RAIN_CLOSED_CAP = 22;
/** Orange WAIT — morning drizzle is not a green GO day. */
export const DRIZZLE_CAUTION_CAP = 40;

type DayScoreInput = {
  amWet?: boolean;
  pmWet?: boolean;
  hoursOpen?: number;
  rainHour?: number | null;
  startHour?: number | null;
  score?: { total: number };
} | null;

/**
 * Displayed day-fit. No hours left stays red.
 * A window that opens after rain — drizzle or a downpour that cleared — is orange, not green and not solid red.
 */
export function dayDisplayTotal(day?: DayScoreInput) {
  const total = day?.score?.total;
  if (total == null) return null;
  if (dayIsClosed(day)) return Math.min(total, AM_RAIN_CLOSED_CAP);
  if (windowStartsAfterRain(day) || afternoonOpenAfterDrizzle(day)) {
    return Math.min(total, DRIZZLE_CAUTION_CAP);
  }
  return total;
}

/** Day-fit total used on the map, ZIP hero, and portal. */
export function dayFitTotal(forecast: Forecast) {
  const day = forecastDayForNow(forecast);
  if (!day) return null;
  return dayDisplayTotal(day);
}

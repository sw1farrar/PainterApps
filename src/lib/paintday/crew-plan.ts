import { isHardPrecip } from "./codes";
import type { PaintDayScore, WeatherSnapshot } from "./score";

export type HourSlot = {
  time: string;
  date: string;
  hour: number;
  snapshot: WeatherSnapshot;
  score: PaintDayScore;
};

export type CrewPlan = {
  startHour: number | null;
  wrapHour: number | null;
  hoursOpen: number;
  secondCoat: boolean;
  rainHour: number | null;
};

export const DAY_START = 7;
export const DAY_END = 18;
export const RECOAT_HOURS = 4;

export function slotIsWet(slot: HourSlot) {
  return isHardPrecip(slot.snapshot.weatherCode, slot.snapshot.precipMm ?? 0);
}

/** Dry enough to coat. Wind does not close the rain window. */
export function slotIsOpen(slot: HourSlot) {
  return !slotIsWet(slot);
}

/** GO / WAIT / NO for a clock hour. NO is rain only. */
export function hourCall(slot: HourSlot): "GO" | "WAIT" | "NO" {
  if (slotIsWet(slot)) return "NO";
  if (slot.score.total >= 70) return "GO";
  return "WAIT";
}

export function buildCrewPlan(slots: HourSlot[], fromHour?: number): CrewPlan {
  const today = slots.filter((s) => s.hour >= DAY_START && s.hour <= DAY_END);
  const rain = today.find((s) =>
    isHardPrecip(s.snapshot.weatherCode, s.snapshot.precipMm ?? 0),
  );
  const rainHour = rain?.hour ?? null;
  const startFloor = fromHour ?? DAY_START;
  const open = today.filter(
    (s) => s.hour >= startFloor && slotIsOpen(s) && (rainHour == null || s.hour < rainHour),
  );
  if (!open.length) {
    return {
      startHour: null,
      wrapHour: null,
      hoursOpen: 0,
      secondCoat: false,
      rainHour,
    };
  }
  const startHour = open[0].hour;
  let wrapHour = startHour;
  for (const slot of open) {
    if (slot.hour > wrapHour + 1) break;
    wrapHour = slot.hour;
  }
  const hoursOpen = wrapHour - startHour + 1;
  return {
    startHour,
    wrapHour,
    hoursOpen,
    secondCoat: hoursOpen >= RECOAT_HOURS,
    rainHour,
  };
}

export function formatClock(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

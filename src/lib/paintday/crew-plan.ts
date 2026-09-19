import { isWetCode } from "./codes";
import { verdictFor } from "./format";
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

const DAY_START = 7;
const DAY_END = 18;
const RECOAT_HOURS = 4;

export function slotIsOpen(slot: HourSlot) {
  const v = verdictFor(slot.score.band);
  if (v === "no") return false;
  if ((slot.snapshot.precipMm ?? 0) >= 0.2) return false;
  if (isWetCode(slot.snapshot.weatherCode)) return false;
  if (slot.snapshot.precipProbability >= 50) return false;
  return v === "go" || slot.score.total >= 60;
}

export function buildCrewPlan(slots: HourSlot[], fromHour?: number): CrewPlan {
  const today = slots.filter((s) => s.hour >= DAY_START && s.hour <= DAY_END);
  const rain = today.find(
    (s) =>
      (s.snapshot.precipMm ?? 0) >= 0.2 ||
      isWetCode(s.snapshot.weatherCode) ||
      s.snapshot.precipProbability >= 60,
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

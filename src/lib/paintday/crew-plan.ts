import { isHardPrecip } from "./codes";
import type { ProductWindow } from "./product-window";
import { LATEX_WINDOW } from "./product-window";
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
export const AM_END = 12;
export const PM_START = 13;
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

export function rainBufferHours(window: ProductWindow = LATEX_WINDOW) {
  const mins = window.rainReadyMinutes ?? 240;
  return Math.max(1, Math.ceil(mins / 60));
}

function planFromOpen(
  open: HourSlot[],
  rainHour: number | null,
): CrewPlan {
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

function openUntilRain(
  today: HourSlot[],
  startFloor: number,
  rainHour: number | null,
  window: ProductWindow,
): HourSlot[] {
  const lastPaint =
    rainHour == null ? DAY_END : rainHour - rainBufferHours(window);
  return today.filter(
    (s) =>
      s.hour >= startFloor &&
      s.hour <= lastPaint &&
      slotIsOpen(s) &&
      (rainHour == null || s.hour < rainHour),
  );
}

function betterPlan(best: CrewPlan, next: CrewPlan) {
  return next.hoursOpen > best.hoursOpen ? next : best;
}

export function buildCrewPlan(
  slots: HourSlot[],
  fromHour?: number,
  window: ProductWindow = LATEX_WINDOW,
): CrewPlan {
  const today = slots.filter((s) => s.hour >= DAY_START && s.hour <= DAY_END);
  const rain = today.find(slotIsWet);
  const rainHour = rain?.hour ?? null;
  const startFloor = fromHour ?? DAY_START;
  const before = planFromOpen(
    openUntilRain(today, startFloor, rainHour, window),
    rainHour,
  );
  if (before.hoursOpen >= RECOAT_HOURS || rainHour == null) return before;

  let best = before;

  // Morning precip, drizzle or soaking, does not close a dry afternoon.
  // Resume at 1pm so the damp late morning is not the paint window.
  const lastAmWet = [...today]
    .reverse()
    .find((s) => s.hour <= AM_END && slotIsWet(s));
  if (lastAmWet) {
    const resumeHour = Math.max(lastAmWet.hour + 1, PM_START, startFloor);
    const nextRain = today.find((s) => s.hour >= resumeHour && slotIsWet(s));
    best = betterPlan(
      best,
      planFromOpen(
        openUntilRain(today, resumeHour, nextRain?.hour ?? null, window),
        rainHour,
      ),
    );
  }

  // Rain that runs past noon and then stops. Hours after the last wet
  // hour are open when they outlast the pre-rain window.
  const lastWet = [...today].reverse().find(slotIsWet);
  if (lastWet && lastWet.hour < DAY_END) {
    const resumeHour = Math.max(lastWet.hour + 1, startFloor);
    if (resumeHour >= PM_START && resumeHour <= DAY_END) {
      best = betterPlan(
        best,
        planFromOpen(openUntilRain(today, resumeHour, null, window), rainHour),
      );
    }
  }

  return best;
}

export function formatClock(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

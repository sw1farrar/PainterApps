import { isSoakingPrecip } from "./codes";
import {
  AM_END,
  DAY_END,
  DAY_START,
  PM_START,
  RECOAT_HOURS,
  buildCrewPlan,
  slotIsOpen,
  slotIsWet,
  type CrewPlan,
  type HourSlot,
} from "./crew-plan";
import type { PaintDayScore, WeatherSnapshot } from "./score";
import { scorePaintDay } from "./score";
import { LATEX_WINDOW, type ProductWindow } from "./product-window";

export type DayFromHours = {
  snapshot: WeatherSnapshot;
  score: PaintDayScore;
  crewPlan: CrewPlan;
  block: HourSlot[];
  representativeHour: number;
};

function bottleneck(block: HourSlot[]) {
  return Math.min(...block.map((h) => h.score.total));
}

function pickRepresentative(block: HourSlot[]): HourSlot {
  const min = bottleneck(block);
  const worst = block.filter((h) => h.score.total === min);
  return worst.find((h) => h.hour === 10) ?? worst[0];
}

function betterBlock(a: HourSlot[], b: HourSlot[]) {
  const d = bottleneck(a) - bottleneck(b);
  if (d !== 0) return d > 0;
  const a10 = a.some((h) => h.hour === 10);
  const b10 = b.some((h) => h.hour === 10);
  if (a10 !== b10) return a10;
  return a[0].hour < b[0].hour;
}

const EMPTY: WeatherSnapshot = {
  precipProbability: 100,
  humidity: 100,
  tempF: 32,
  dewPointF: 32,
  windMph: 30,
  minTempNext48hF: 20,
};

export function scoreDayFromHours(
  hours: HourSlot[],
  window: ProductWindow = LATEX_WINDOW,
): DayFromHours {
  const appHours = hours
    .filter((h) => h.hour >= DAY_START && h.hour <= DAY_END)
    .slice()
    .sort((a, b) => a.hour - b.hour);
  const crewPlan = buildCrewPlan(appHours, DAY_START, window);
  const firstPaint = crewPlan.startHour ?? DAY_START;
  const lastPaint = crewPlan.wrapHour ?? DAY_END;

  if (!appHours.length) {
    return {
      snapshot: EMPTY,
      score: scorePaintDay(EMPTY, window),
      crewPlan,
      block: [],
      representativeHour: 10,
    };
  }

  if (crewPlan.hoursOpen === 0) {
    const wet = appHours.find(slotIsWet) ?? appHours[0];
    return {
      snapshot: wet.snapshot,
      score: wet.score,
      crewPlan,
      block: [wet],
      representativeHour: wet.hour,
    };
  }

  let best4: HourSlot[] | null = null;
  for (let i = 0; i + RECOAT_HOURS <= appHours.length; i++) {
    const block = appHours.slice(i, i + RECOAT_HOURS);
    const consecutive = block.every((h, j) => j === 0 || h.hour === block[j - 1].hour + 1);
    if (
      !consecutive ||
      !block.every(
        (h) => slotIsOpen(h) && h.hour >= firstPaint && h.hour <= lastPaint,
      )
    ) {
      continue;
    }
    if (!best4 || betterBlock(block, best4)) best4 = block;
  }

  const block =
    best4 ??
    [
      (appHours.filter(
        (h) => slotIsOpen(h) && h.hour >= firstPaint && h.hour <= lastPaint,
      ).length
        ? appHours.filter(
            (h) => slotIsOpen(h) && h.hour >= firstPaint && h.hour <= lastPaint,
          )
        : appHours.filter(slotIsOpen).length
          ? appHours.filter(slotIsOpen)
          : appHours
      ).reduce((best, h) => (h.score.total > best.score.total ? h : best)),
    ];

  const representative = pickRepresentative(block);
  return {
    snapshot: representative.snapshot,
    score: representative.score,
    crewPlan,
    block,
    representativeHour: representative.hour,
  };
}

export type PrecipWitness = {
  hour: number;
  precipMm: number;
  weatherCode?: number;
};

export type DayHalf = {
  /** Any hour in the half is hard precip. */
  wet: boolean;
  /** Soaking rain, storm, snow, or ice in this half. */
  soaked: boolean;
  rainedOut: boolean;
  score: number;
  witness: PrecipWitness | null;
};

function longestDryRun(slots: HourSlot[]) {
  let best = 0;
  let run = 0;
  let prev = -1;
  for (const slot of slots) {
    if (slotIsWet(slot)) {
      run = 0;
      prev = slot.hour;
      continue;
    }
    run = prev >= 0 && slot.hour === prev + 1 ? run + 1 : 1;
    prev = slot.hour;
    if (run > best) best = run;
  }
  return best;
}

export function scoreDayHalf(
  hours: HourSlot[],
  lo: number,
  hi: number,
  window: ProductWindow = LATEX_WINDOW,
): DayHalf {
  const slots = hours
    .filter((h) => h.hour >= lo && h.hour <= hi)
    .slice()
    .sort((a, b) => a.hour - b.hour);
  const wetSlots = slots.filter(slotIsWet);
  const wet = wetSlots.length > 0;
  const soaked = wetSlots.some((slot) =>
    isSoakingPrecip(slot.snapshot.weatherCode, slot.snapshot.precipMm ?? 0),
  );
  const rainedOut = wet && (soaked || longestDryRun(slots) < 2);
  const first = wetSlots[0];
  const witness = first
    ? {
        hour: first.hour,
        precipMm: first.snapshot.precipMm ?? 0,
        weatherCode: first.snapshot.weatherCode,
      }
    : null;
  if (!slots.length) {
    return { wet: false, soaked: false, rainedOut: false, score: 0, witness: null };
  }
  const scored = scoreDayFromHours(slots, window);
  return { wet, soaked, rainedOut, score: scored.score.total, witness };
}

export function precipDayFields(
  dayHours: HourSlot[],
  am: DayHalf,
  pm: DayHalf,
  rainHour: number | null,
) {
  const rainSlot =
    rainHour == null ? undefined : dayHours.find((h) => h.hour === rainHour);
  return {
    amWet: am.wet,
    pmWet: pm.wet,
    amRainedOut: am.rainedOut,
    pmRainedOut: pm.rainedOut,
    rainMm: rainSlot ? (rainSlot.snapshot.precipMm ?? 0) : null,
    pmRainHour: pm.witness?.hour ?? null,
    pmRainMm: pm.witness ? pm.witness.precipMm : null,
  };
}

export function morningHalf(hours: HourSlot[], window?: ProductWindow) {
  return scoreDayHalf(hours, DAY_START, AM_END, window);
}

export function afternoonHalf(hours: HourSlot[], window?: ProductWindow) {
  return scoreDayHalf(hours, PM_START, DAY_END, window);
}

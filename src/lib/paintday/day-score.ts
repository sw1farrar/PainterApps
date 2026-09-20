import {
  DAY_END,
  DAY_START,
  RECOAT_HOURS,
  buildCrewPlan,
  slotIsOpen,
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
  return block.find((h) => h.hour === 10) ?? block[Math.floor((block.length - 1) / 2)];
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
  const crewPlan = buildCrewPlan(appHours);

  if (!appHours.length) {
    return {
      snapshot: EMPTY,
      score: scorePaintDay(EMPTY, window),
      crewPlan,
      block: [],
      representativeHour: 10,
    };
  }

  let best4: HourSlot[] | null = null;
  for (let i = 0; i + RECOAT_HOURS <= appHours.length; i++) {
    const block = appHours.slice(i, i + RECOAT_HOURS);
    const consecutive = block.every((h, j) => j === 0 || h.hour === block[j - 1].hour + 1);
    if (!consecutive || !block.every(slotIsOpen)) continue;
    if (!best4 || betterBlock(block, best4)) best4 = block;
  }

  const block =
    best4 ??
    [
      (appHours.filter(slotIsOpen).length
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

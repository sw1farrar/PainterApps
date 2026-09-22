import { DAY_END, DAY_START, buildCrewPlan, type HourSlot } from "@/lib/paintday/crew-plan";
import {
  afternoonHalf,
  morningHalf,
  precipDayFields,
  scoreDayFromHours,
} from "@/lib/paintday/day-score";
import type { ProductWindow } from "@/lib/paintday/product-window";
import { LATEX_WINDOW } from "@/lib/paintday/product-window";
import { scorePaintDay } from "@/lib/paintday/score";
import type { DailyWindow, Forecast } from "./types";

const UA =
  process.env.NWS_USER_AGENT ??
  "PainterApps/1.0 (https://painterapps.com; weather@painterapps.com)";

type NwsPeriod = {
  startTime: string;
  temperature: number;
  temperatureUnit?: string;
  probabilityOfPrecipitation?: { value: number | null };
  dewpoint?: { value: number | null; unitCode?: string };
  relativeHumidity?: { value: number | null };
  windSpeed?: string;
  windGust?: string;
  shortForecast?: string;
};

const gridCache = new Map<string, { hourly: string; timeZone: string }>();

function nwsCode(text: string) {
  const t = text.toLowerCase();
  if (t.includes("thunder") || t.includes("t-storm")) return 95;
  if (t.includes("snow") || t.includes("sleet") || t.includes("ice")) return 73;
  if (t.includes("rain") || t.includes("shower")) return 63;
  if (t.includes("drizzle")) return 51;
  if (t.includes("fog")) return 45;
  return 0;
}

function parseMph(raw?: string) {
  if (!raw) return 0;
  const nums = [...raw.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
  if (!nums.length) return 0;
  return Math.max(...nums);
}

function cToF(c: number) {
  return (c * 9) / 5 + 32;
}

async function nwsGet(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": UA,
      Accept: "application/geo+json",
    },
  });
  if (!res.ok) throw new Error(`NWS ${res.status}`);
  return res.json();
}

async function gridFor(lat: number, lng: number) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = gridCache.get(key);
  if (hit) return hit;
  const json = await nwsGet(
    `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
  );
  const props = json?.properties ?? {};
  const hourly = props.forecastHourly as string | undefined;
  const timeZone = (props.timeZone as string) || "America/New_York";
  if (!hourly) throw new Error("NWS missing hourly forecast URL");
  const entry = { hourly, timeZone };
  gridCache.set(key, entry);
  return entry;
}

export async function getNwsForecast(
  lat: number,
  lng: number,
  window: ProductWindow = LATEX_WINDOW,
): Promise<Forecast> {
  const grid = await gridFor(lat, lng);
  const json = await nwsGet(grid.hourly);
  const periods = (json?.properties?.periods ?? []) as NwsPeriod[];
  if (!periods.length) throw new Error("NWS hourly empty");

  const hours: HourSlot[] = periods.map((p) => {
    const start = new Date(p.startTime);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: grid.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(start);
    const pick = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? "";
    const hour = Number(pick("hour"));
    const date = `${pick("year")}-${pick("month")}-${pick("day")}`;
    const code = nwsCode(p.shortForecast ?? "");
    const pop = p.probabilityOfPrecipitation?.value ?? 0;
    const dewC = p.dewpoint?.value;
    const tempF =
      p.temperatureUnit === "C" ? cToF(p.temperature) : p.temperature;
    const dewF =
      dewC == null
        ? tempF - 10
        : p.dewpoint?.unitCode?.includes("degC")
          ? cToF(dewC)
          : dewC;
    const wet = code >= 61;
    const snapshot = {
      precipProbability: pop,
      precipMm: wet ? 0.4 : 0,
      weatherCode: code,
      humidity: p.relativeHumidity?.value ?? 50,
      tempF,
      dewPointF: dewF,
      windMph: parseMph(p.windSpeed),
      gustMph: parseMph(p.windGust) || undefined,
      minTempNext48hF: tempF - 8,
    };
    return {
      time: p.startTime,
      date,
      hour,
      snapshot,
      score: scorePaintDay(snapshot, window),
    };
  });

  const dates = [...new Set(hours.map((h) => h.date))];
  const nowParts = new Intl.DateTimeFormat("en-US", {
    timeZone: grid.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) =>
    nowParts.find((p) => p.type === type)?.value ?? "";
  const nowDate = `${get("year")}-${get("month")}-${get("day")}`;
  const nowHour = Number(get("hour"));
  const current =
    hours.find((h) => h.date === nowDate && h.hour === nowHour) ?? hours[0];
  const todayHours = hours.filter(
    (h) => h.date === nowDate && h.hour >= DAY_START && h.hour <= DAY_END,
  );
  const days: DailyWindow[] = dates.map((date) => {
    const dayHours = hours.filter(
      (h) => h.date === date && h.hour >= DAY_START && h.hour <= DAY_END,
    );
    const day = scoreDayFromHours(dayHours, window);
    const am = morningHalf(dayHours, window);
    const pm = afternoonHalf(dayHours, window);
    const precip = precipDayFields(dayHours, am, pm, day.crewPlan.rainHour);
    const highs = dayHours.map((h) => h.snapshot.tempF);
    const pops = dayHours.map((h) => h.snapshot.precipProbability);
    return {
      date,
      snapshot: day.snapshot,
      score: day.score,
      highF: highs.length ? Math.max(...highs) : current.snapshot.tempF,
      precipChance: pops.length ? Math.round(Math.max(...pops)) : 0,
      startHour: day.crewPlan.startHour,
      wrapHour: day.crewPlan.wrapHour,
      rainHour: day.crewPlan.rainHour,
      hoursOpen: day.crewPlan.hoursOpen,
      windowPrecipChance: pops.length ? Math.round(Math.max(...pops)) : 0,
      amScore: am.score,
      pmScore: pm.score,
      amWet: precip.amWet,
      pmWet: precip.pmWet,
      amRainedOut: precip.amRainedOut,
      pmRainedOut: precip.pmRainedOut,
      rainMm: precip.rainMm,
      pmRainHour: precip.pmRainHour,
      pmRainMm: precip.pmRainMm,
      windowHour: day.representativeHour,
    };
  });

  return {
    source: "nws",
    fetchedAt: new Date().toISOString(),
    timezone: grid.timeZone,
    current: current.snapshot,
    currentScore: current.score,
    hours,
    todayHours,
    crewPlan: buildCrewPlan(todayHours, nowHour, window),
    days,
  };
}

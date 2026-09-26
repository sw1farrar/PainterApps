"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { formatClock } from "@/lib/paintday/crew-plan";
import {
  fitCall,
  formatDow,
  formatWeekday,
  mmText,
  windowLine,
} from "@/lib/paintday/format";
import {
  afternoonOpenAfterDrizzle,
  dayDisplayTotal,
  dayIsClosed,
  morningWasSoaking,
  windowStartsAfterRain,
} from "@/lib/paintday/today";
import { cn } from "@/lib/utils";
import type { DailyWindow } from "@/lib/weather/types";

function colorFor(score: number) {
  if (score >= 85) return "#10b981";
  if (score >= 70) return "#14b8a6";
  if (score >= 50) return "#eab308";
  if (score >= 30) return "#f97316";
  return "#ef4444";
}

function DayTick({
  x = 0,
  y = 0,
  date,
  dow,
}: {
  x?: number;
  y?: number;
  date?: string;
  dow?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill="var(--muted-foreground)"
      fontSize={11}
    >
      <tspan x={x} dy={11}>
        {dow}
      </tspan>
      {date ? (
        <tspan x={x} dy={12}>
          {date}
        </tspan>
      ) : null}
    </text>
  );
}

type Row = {
  date: string;
  dow: string;
  iso: string;
  weekday: string;
  score: number;
  call: string;
  summaryKey: string;
  window: string;
  highF: number;
  precip: number;
  rainHour: number | null;
  pmWet: boolean;
  pmRainedOut: boolean;
  pmRainHour: number | null;
  pmRainMm: number | null;
  closed: boolean;
  drizzlePm: boolean;
  rainCleared: boolean;
  active: boolean;
};

function Tip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Row }>;
}) {
  const t = useTranslations("paintday");
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const summary = d.closed
    ? t("summaries.do-not-paint-rain")
    : d.drizzlePm || d.rainCleared
      ? ""
      : t.has(`summaries.${d.summaryKey}`)
        ? t(`summaries.${d.summaryKey}` as never)
        : "";
  const witnessHour = d.pmRainHour ?? d.rainHour;
  const amount = mmText(d.pmRainMm);
  const rainLine =
    d.pmRainedOut && witnessHour != null
      ? t("chartRainMm", {
          hour: formatClock(witnessHour),
          mm: amount || "—",
        })
      : d.pmWet && !d.pmRainedOut && witnessHour != null
        ? t("chartDrizzleMm", {
            hour: formatClock(witnessHour),
            mm: amount || "—",
          })
        : (d.drizzlePm || d.rainCleared) && d.rainHour != null
          ? d.rainCleared
            ? t("chartRainAt", { hour: formatClock(d.rainHour) })
            : t("chartDrizzleAt", { hour: formatClock(d.rainHour), n: d.precip })
          : d.rainHour != null
            ? t("chartRainAt", { hour: formatClock(d.rainHour) })
            : t("chartRain", { n: d.precip });
  return (
    <div className="max-w-xs rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="text-sm font-medium">{d.weekday}</p>
      <p className="mt-0.5 tabular-nums">
        {d.call} · {t("fitOf", { n: d.score })}
      </p>
      {d.closed ? (
        <p className="mt-1 text-destructive">{t("amRainDay")}</p>
      ) : d.rainCleared ? (
        <p className="mt-1">{t("amRainPmOpen")}</p>
      ) : d.drizzlePm ? (
        <p className="mt-1">{t("amDrizzlePmOpen")}</p>
      ) : d.pmRainedOut ? (
        <p className="mt-1">{t("pmRainSplit")}</p>
      ) : d.pmWet ? (
        <p className="mt-1">{t("pmDrizzleNote")}</p>
      ) : null}
      {d.window ? <p className="mt-1">{t("paintWindow", { window: d.window })}</p> : null}
      <p className="mt-1 text-muted-foreground">
        {t("chartHigh", { n: d.highF })} · {rainLine}
      </p>
      {summary ? <p className="mt-1 text-muted-foreground">{summary}</p> : null}
    </div>
  );
}

export function ForecastChart({
  days,
  className,
  activeDate,
}: {
  days: DailyWindow[];
  className?: string;
  activeDate?: string;
}) {
  const locale = useLocale();
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const showDate = width >= 680;
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const apply = () => setWidth(el.clientWidth);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const data: Row[] = days.map((d) => {
    const closed = dayIsClosed(d);
    const drizzlePm = afternoonOpenAfterDrizzle(d);
    const afterRain = windowStartsAfterRain(d) || drizzlePm;
    const rainCleared = afterRain && morningWasSoaking(d);
    const score = dayDisplayTotal(d) ?? d.score.total;
    const lightPm = Boolean(d.pmWet) && !d.pmRainedOut;
    return {
      date: d.date.slice(5),
      dow: formatDow(d.date, locale),
      iso: d.date,
      weekday: formatWeekday(d.date, locale),
      score,
      call: closed ? "NO" : fitCall(score),
      summaryKey: d.score.summaryKey,
      window: closed
        ? ""
        : windowLine(d.startHour, d.wrapHour, d.rainHour, lightPm, rainCleared),
      highF: Math.round(d.highF ?? d.snapshot.tempF),
      precip: Math.round(d.windowPrecipChance ?? d.precipChance ?? 0),
      rainHour: d.rainHour ?? null,
      pmWet: Boolean(d.pmWet),
      pmRainedOut: Boolean(d.pmRainedOut),
      pmRainHour: d.pmRainHour ?? null,
      pmRainMm: d.pmRainMm ?? null,
      closed,
      drizzlePm: drizzlePm && !rainCleared,
      rainCleared,
      active: d.date === activeDate,
    };
  });

  return (
    <div ref={frame} className={cn("h-56 w-full min-w-0 max-w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            interval={0}
            height={showDate ? 32 : 18}
            axisLine={false}
            tickLine={false}
            tick={(props) => (
              <DayTick
                x={props.x}
                y={props.y}
                date={showDate ? props.payload?.value : undefined}
                dow={data.find((row) => row.date === props.payload?.value)?.dow}
              />
            )}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={<Tip />}
          />
          <Bar dataKey="score" radius={[6, 6, 2, 2]}>
            {data.map((d) => (
              <Cell
                key={d.iso}
                fill={colorFor(d.closed ? 15 : d.score)}
                stroke={d.active ? "var(--foreground)" : "transparent"}
                strokeWidth={d.active ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

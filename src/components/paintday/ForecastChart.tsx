"use client";

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
import { fitCall, formatWeekday, windowLine } from "@/lib/paintday/format";
import {
  afternoonOpenAfterDrizzle,
  dayDisplayTotal,
  dayIsClosed,
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

type Row = {
  date: string;
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
  closed: boolean;
  drizzlePm: boolean;
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
    : d.drizzlePm
      ? ""
      : t.has(`summaries.${d.summaryKey}`)
        ? t(`summaries.${d.summaryKey}` as never)
        : "";
  const rainLine =
    d.drizzlePm && d.rainHour != null
      ? t("chartDrizzleAt", { hour: formatClock(d.rainHour), n: d.precip })
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
      ) : d.drizzlePm ? (
        <p className="mt-1">{t("amDrizzlePmOpen")}</p>
      ) : d.pmWet ? (
        <p className="mt-1">{t("pmRainSplit")}</p>
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
}: {
  days: DailyWindow[];
  className?: string;
}) {
  const locale = useLocale();
  const data: Row[] = days.map((d) => {
    const closed = dayIsClosed(d);
    const drizzlePm = afternoonOpenAfterDrizzle(d);
    const score = dayDisplayTotal(d) ?? d.score.total;
    return {
      date: d.date.slice(5),
      iso: d.date,
      weekday: formatWeekday(d.date, locale),
      score,
      call: closed ? "NO" : fitCall(score),
      summaryKey: d.score.summaryKey,
      window: closed ? "" : windowLine(d.startHour, d.wrapHour, d.rainHour),
      highF: Math.round(d.highF ?? d.snapshot.tempF),
      precip: Math.round(d.windowPrecipChance ?? d.precipChance ?? 0),
      rainHour: d.rainHour ?? null,
      pmWet: Boolean(d.pmWet),
      closed,
      drizzlePm,
    };
  });

  return (
    <div className={cn("h-56 w-full min-w-0 max-w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
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
              <Cell key={d.iso} fill={colorFor(d.closed ? 15 : d.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

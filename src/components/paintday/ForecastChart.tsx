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
import { fitCall, formatWeekday, windowLine } from "@/lib/paintday/format";
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
  amWet: boolean;
  pmWet: boolean;
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
  const summary = d.amWet
    ? t("summaries.do-not-paint-rain")
    : t.has(`summaries.${d.summaryKey}`)
      ? t(`summaries.${d.summaryKey}` as never)
      : "";
  return (
    <div className="max-w-xs rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="text-sm font-medium">{d.weekday}</p>
      <p className="mt-0.5 tabular-nums">
        {d.call} · {t("fitOf", { n: d.score })}
      </p>
      {d.amWet ? (
        <p className="mt-1 text-destructive">{t("amRainDay")}</p>
      ) : d.pmWet ? (
        <p className="mt-1">{t("pmRainSplit")}</p>
      ) : null}
      {d.window ? <p className="mt-1">{t("paintWindow", { window: d.window })}</p> : null}
      <p className="mt-1 text-muted-foreground">
        {t("chartHigh", { n: d.highF })} · {t("chartRain", { n: d.precip })}
      </p>
      {summary ? <p className="mt-1 text-muted-foreground">{summary}</p> : null}
    </div>
  );
}

export function ForecastChart({ days }: { days: DailyWindow[] }) {
  const locale = useLocale();
  const data: Row[] = days.map((d) => ({
    date: d.date.slice(5),
    iso: d.date,
    weekday: formatWeekday(d.date, locale),
    score: d.score.total,
    call: d.amWet ? "NO" : fitCall(d.score.total),
    summaryKey: d.score.summaryKey,
    window: d.amWet
      ? ""
      : windowLine(d.startHour, d.wrapHour, d.rainHour),
    highF: Math.round(d.highF ?? d.snapshot.tempF),
    precip: Math.round(d.windowPrecipChance ?? d.precipChance ?? 0),
    amWet: Boolean(d.amWet),
    pmWet: Boolean(d.pmWet),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
              <Cell key={d.iso} fill={colorFor(d.amWet ? 15 : d.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

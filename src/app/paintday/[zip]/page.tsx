import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ForecastChart } from "@/components/paintday/ForecastChart";
import { HourlyStrip } from "@/components/paintday/HourlyStrip";
import { SnapshotJobButton } from "@/components/jobs/SnapshotJobButton";
import { SaveLocationButton } from "@/components/paintday/SaveLocationButton";
import { ScoreRing } from "@/components/paintday/ScoreRing";
import { ShareButton } from "@/components/paintday/ShareButton";
import { ZipSearch } from "@/components/paintday/ZipSearch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUnits } from "@/lib/auth/current-units";
import { currentUserId } from "@/lib/auth/current-user";
import { getLocale } from "next-intl/server";
import { listMyJobs } from "@/lib/jobs/list";
import { productWindowForZip } from "@/lib/jobs/product-window";
import { formatClock } from "@/lib/paintday/crew-plan";
import { isHardPrecip } from "@/lib/paintday/codes";
import {
  fitCall,
  formatFactorValue,
  formatWeekday,
  precipVerdict,
} from "@/lib/paintday/format";
import { getZipPaintDay } from "@/lib/paintday/get-zip";
import { LATEX_WINDOW } from "@/lib/paintday/product-window";
import { isUsZip } from "@/lib/utils";
import type { ScoreFactorId } from "@/lib/paintday/score";
import { scoreColor } from "@/lib/paintday/score";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zip: string }>;
}) {
  const { zip } = await params;
  return {
    title: `PaintDay ${zip}`,
    description: `PaintDay weather score and 14-day exterior window for ZIP ${zip}.`,
  };
}

export default async function ZipPage({
  params,
}: {
  params: Promise<{ zip: string }>;
}) {
  const { zip } = await params;
  if (!isUsZip(zip)) notFound();
  const productWindow = await productWindowForZip(zip);
  const [data, userId, jobs, units, locale] = await Promise.all([
    getZipPaintDay(zip, productWindow),
    currentUserId(),
    listMyJobs(),
    currentUnits(),
    getLocale(),
  ]);
  if (!data) notFound();

  const t = await getTranslations("paintday");
  const { place, forecast } = data;
  const score = forecast.currentScore;
  const snap = forecast.current;
  const summary = t(`summaries.${score.summaryKey}` as never);
  const verdict = precipVerdict(
    isHardPrecip(snap.weatherCode, snap.precipMm ?? 0),
    score.band,
  );
  const verdictLabel =
    verdict === "go"
      ? t("verdictGo")
      : verdict === "no"
        ? t("verdictNo")
        : t("verdictCaution");
  const best = [...forecast.days]
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ZipSearch initial={zip} />
      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{place.label}</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title")} {zip}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {forecast.source === "open-meteo"
              ? t("sourceOpenMeteo")
              : t("sourceDemo")}
            {" · "}
            {t("windowHint")}
          </p>
          {forecast.source !== "open-meteo" ? (
            <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t("demoBanner")}
            </p>
          ) : null}
          <p className="mt-4 text-3xl font-semibold tracking-tight">
            {verdictLabel}
          </p>
          <p className="text-muted-foreground">{summary}</p>
          {forecast.crewPlan?.startHour != null &&
          forecast.crewPlan.wrapHour != null ? (
            <p className="mt-2 text-sm">
              {t("startAfter", { time: formatClock(forecast.crewPlan.startHour) })}
              {" · "}
              {t("wrapBy", { time: formatClock(forecast.crewPlan.wrapHour) })}
              {forecast.crewPlan.rainHour != null
                ? ` · ${t("rainAfter", { time: formatClock(forecast.crewPlan.rainHour) })}`
                : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("noWindow")}</p>
          )}
          {(forecast.crewPlan?.hoursOpen ?? 0) > 0 ? (
            <p className="text-sm text-muted-foreground">
              {forecast.crewPlan.secondCoat ? t("secondCoat") : t("oneCoat")}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {t("forecastAge", {
              time: new Date(forecast.fetchedAt).toLocaleTimeString(locale, {
                hour: "numeric",
                minute: "2-digit",
              }),
            })}
            {productWindow
              ? ` · ${t("productWindow", {
                  name: productWindow.name ?? LATEX_WINDOW.name ?? "latex",
                  min: productWindow.minTempF,
                  max: productWindow.maxTempF,
                  rh: productWindow.maxHumidityPct,
                })}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SaveLocationButton zip={zip} signedIn={Boolean(userId)} />
          <SnapshotJobButton
            signedIn={Boolean(userId)}
            loginNext={`/paintday/${zip}`}
            kind="weather"
            title={`PaintDay ${place.label}`}
            zip={zip}
            payload={{
              zip,
              place: place.label,
              score: score.total,
              summary: score.summaryKey,
              best: best.map((d) => ({ date: d.date, score: d.score.total })),
              capturedAt: forecast.fetchedAt,
            }}
            label={t("snapshot")}
            jobs={jobs}
          />
          <ShareButton zip={zip} />
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
        <ScoreRing
          score={score.total}
          label={t("scoreLabel")}
          summary={summary}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {score.factors.map((f) => (
            <Card key={f.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {t(`factor.${f.id}` as never)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">
                  {formatFactorValue(f.id, snap, units)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`factorHint.${f.id}` as never)}
                </p>
                <p
                  className="mt-2 text-sm font-medium"
                  style={{ color: scoreColor(f.score) }}
                >
                  {t("fitOf", { n: f.score })} {fitCall(f.score)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {t(`factorHelp.${f.id as ScoreFactorId}`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">{t("hourlyTitle")}</h2>
        <div className="mt-3">
          <HourlyStrip
            hours={forecast.todayHours ?? []}
            nowHour={Number(
              new Intl.DateTimeFormat("en-US", {
                timeZone: forecast.timezone,
                hour: "2-digit",
                hourCycle: "h23",
              }).format(new Date()),
            )}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">{t("fourteen")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("bestDays")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {best.map((d) => (
            <span
              key={d.date}
              className="rounded-full border border-border px-3 py-1 text-sm"
            >
              {formatWeekday(d.date, locale)} {fitCall(d.score.total)} ·{" "}
              {t("fitOf", { n: d.score.total })}
            </span>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <ForecastChart days={forecast.days} />
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/systems"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          {t("matchSystem")}
        </Link>
        <Link
          href="/calc"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
        >
          {t("figureGallons")}
        </Link>
      </div>
    </div>
  );
}

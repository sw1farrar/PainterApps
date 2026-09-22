import { notFound } from "next/navigation";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { ForecastChart } from "@/components/paintday/ForecastChart";
import { HourlyStrip } from "@/components/paintday/HourlyStrip";
import { SaveLocationButton } from "@/components/paintday/SaveLocationButton";
import { ScoreRing } from "@/components/paintday/ScoreRing";
import { ShareButton } from "@/components/paintday/ShareButton";
import { ZipSearch } from "@/components/paintday/ZipSearch";
import { ClientIntl } from "@/components/i18n/ClientIntl";
import { currentUnits } from "@/lib/auth/current-units";
import { currentUserId } from "@/lib/auth/current-user";
import { DAY_END, DAY_START, hourCall } from "@/lib/paintday/crew-plan";
import { isHardPrecip } from "@/lib/paintday/codes";
import {
  factorFitCall,
  formatFactorValue,
  formatWeekday,
  mmText,
  precipVerdict,
  windowLine,
} from "@/lib/paintday/format";
import { getZipPaintDay } from "@/lib/paintday/get-zip";
import { bandForScore, scoreColor } from "@/lib/paintday/score";
import {
  afternoonOpenAfterDrizzle,
  dayDisplayTotal,
  dayIsClosed,
  forecastDayForNow,
  localIsoDate,
} from "@/lib/paintday/today";
import {
  weatherBugDetailsUrl,
  weatherBugHourlyUrl,
  weatherBugRadarUrl,
  weatherBugTenDayUrl,
} from "@/lib/paintday/radar";
import { isUsZip } from "@/lib/utils";

export const revalidate = 900;

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

function WeatherLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted"
    >
      {children}
    </a>
  );
}

export default async function ZipPage({
  params,
  searchParams,
}: {
  params: Promise<{ zip: string }>;
  searchParams: Promise<{ coat?: string; day?: string }>;
}) {
  const { zip } = await params;
  const { day: dayQuery } = await searchParams;
  if (!isUsZip(zip)) notFound();
  const [data, userId, units, locale, messages] = await Promise.all([
    getZipPaintDay(zip),
    currentUserId(),
    currentUnits(),
    getLocale(),
    getMessages(),
  ]);
  if (!data) notFound();

  const t = await getTranslations("paintday");
  const { place, forecast } = data;
  const today = forecastDayForNow(forecast);
  const day =
    (dayQuery && forecast.days.find((d) => d.date === dayQuery)) || today;
  const closedDay = dayIsClosed(day);
  const drizzleDay = afternoonOpenAfterDrizzle(day);
  const rawScore = day?.score ?? forecast.currentScore;
  const shownTotal = dayDisplayTotal(day) ?? rawScore.total;
  const score = closedDay
    ? {
        ...rawScore,
        total: shownTotal,
        band: "do-not-paint" as const,
        summaryKey: "do-not-paint-rain",
      }
    : drizzleDay
      ? {
          ...rawScore,
          total: shownTotal,
          band: bandForScore(shownTotal),
          summaryKey: "risky-drizzle",
        }
      : rawScore;
  const snap = day?.snapshot ?? forecast.current;
  const nowHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: forecast.timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  const todayIso = localIsoDate(forecast.timezone);
  const nowSlot =
    forecast.todayHours?.find((h) => h.hour === nowHour) ??
    forecast.hours.find((h) => h.date === todayIso && h.hour === nowHour);
  const nowCall = nowSlot ? hourCall(nowSlot) : null;
  const closed = dayIsClosed(day);
  const wetNow = isHardPrecip(
    forecast.current.weatherCode,
    forecast.current.precipMm ?? 0,
  );
  const verdict = closed ? "no" : precipVerdict(false, score.band);
  const lightPm = Boolean(day?.pmWet) && !day?.pmRainedOut;
  const windowText = closed
    ? ""
    : windowLine(
        day?.startHour ?? forecast.crewPlan.startHour,
        day?.wrapHour ?? forecast.crewPlan.wrapHour,
        day?.rainHour ?? forecast.crewPlan.rainHour,
        lightPm,
      );
  const witnessMm = mmText(day?.pmRainMm ?? day?.rainMm);
  const selectedIso = day?.date ?? todayIso;
  const viewingToday = selectedIso === todayIso;
  const stripHours = forecast.hours.filter(
    (h) =>
      h.date === selectedIso && h.hour >= DAY_START && h.hour <= DAY_END,
  );
  const verdictLabel =
    verdict === "go"
      ? t("verdictGo")
      : verdict === "no"
        ? t("verdictNo")
        : t("verdictCaution");
  const best = [...forecast.days]
    .filter((d) => !dayIsClosed(d))
    .sort(
      (a, b) => (dayDisplayTotal(b) ?? 0) - (dayDisplayTotal(a) ?? 0),
    )
    .slice(0, 3);
  const pulled = new Date(forecast.fetchedAt).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: forecast.timezone,
  });
  const source =
    forecast.source === "open-meteo"
      ? t("sourceOpenMeteo")
      : forecast.source === "nws"
        ? t("sourceNws")
        : t("sourceDemo");

  return (
    <ClientIntl locale={locale} messages={messages}>
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col gap-2 overflow-hidden px-3 py-2 lg:px-4">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="w-full min-w-0 max-w-sm">
            <ZipSearch
              initial={zip}
              size="compact"
              copy={{
                searchLabel: t("searchLabel"),
                searchPlaceholder: t("searchPlaceholder"),
                searchCta: t("searchCta"),
                invalidZip: t("invalidZip"),
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{place.label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {verdictLabel}
              {!viewingToday && day ? ` · ${formatWeekday(day.date, locale)}` : ""}
              {windowText ? ` · ${windowText}` : ` · ${t("noWindow")}`}
              {viewingToday && nowCall
                ? ` · ${t("nowCall", { call: nowCall })}${wetNow ? ` · ${t("nowWet")}` : ""}`
                : ""}
              {` · ${source} · ${pulled}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <SaveLocationButton zip={zip} signedIn={Boolean(userId)} />
            <ShareButton zip={zip} />
            <WeatherLink href={weatherBugRadarUrl(zip)}>{t("radar")}</WeatherLink>
            <WeatherLink href={weatherBugDetailsUrl(zip)}>
              {t("weatherDetails")}
            </WeatherLink>
            <WeatherLink href={weatherBugHourlyUrl(zip)}>
              {t("hourlyDetails")}
            </WeatherLink>
            <WeatherLink href={weatherBugTenDayUrl(zip)}>{t("tenDay")}</WeatherLink>
          </div>
        </div>

        {forecast.source === "demo" ? (
          <p className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
            {t("demoBanner")}
          </p>
        ) : null}

        <div className="grid shrink-0 grid-cols-1 items-center gap-2 sm:grid-cols-[auto_1fr]">
          <ScoreRing score={score.total} size={104} compact />
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            {score.factors.map((f) => (
              <div
                key={f.id}
                className="min-w-0 rounded-lg border border-border px-2 py-1.5"
              >
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`factor.${f.id}` as never)}
                </p>
                <p className="truncate text-sm font-semibold tabular-nums">
                  {f.id === "precip" && witnessMm
                    ? witnessMm
                    : formatFactorValue(f.id, snap, units)}
                </p>
                <p
                  className="text-[11px] font-medium"
                  style={{ color: scoreColor(f.score) }}
                >
                  {f.score} {factorFitCall(f.id, f.score)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <section className="shrink-0">
          <h2 className="sr-only">{t("hourlyTitle")}</h2>
          <HourlyStrip
            hours={stripHours.length ? stripHours : (forecast.todayHours ?? [])}
            nowHour={viewingToday ? nowHour : undefined}
          />
        </section>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">{t("fourteen")}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {t("bestDays")}
              {best.length
                ? `: ${best
                    .map(
                      (d) =>
                        `${formatWeekday(d.date, locale)} ${dayDisplayTotal(d) ?? d.score.total}`,
                    )
                    .join(" · ")}`
                : ""}
            </p>
          </div>
          <div className="relative mt-1 min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
            <div className="absolute inset-0 px-2 py-1">
              <ForecastChart
                days={forecast.days}
                className="h-full"
                activeDate={selectedIso}
              />
            </div>
          </div>
        </section>
      </div>
    </ClientIntl>
  );
}

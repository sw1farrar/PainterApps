import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ForecastChart } from "@/components/paintday/ForecastChart";
import { SaveLocationButton } from "@/components/paintday/SaveLocationButton";
import { ScoreRing } from "@/components/paintday/ScoreRing";
import { ShareButton } from "@/components/paintday/ShareButton";
import { ZipSearch } from "@/components/paintday/ZipSearch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUserId } from "@/lib/auth/current-user";
import { getZipPaintDay } from "@/lib/paintday/get-zip";
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
  const [data, userId] = await Promise.all([
    getZipPaintDay(zip),
    currentUserId(),
  ]);
  if (!data) notFound();

  const t = await getTranslations("paintday");
  const { place, forecast } = data;
  const score = forecast.currentScore;
  const summary = t(`summaries.${score.summaryKey}` as never);
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
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SaveLocationButton zip={zip} signedIn={Boolean(userId)} />
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
                <p
                  className="score-numeral text-3xl font-semibold"
                  style={{ color: scoreColor(f.score) }}
                >
                  {f.score}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {t(`factorHelp.${f.id as ScoreFactorId}`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">{t("fourteen")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("bestDays")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {best.map((d) => (
            <span
              key={d.date}
              className="rounded-full border border-border px-3 py-1 text-sm"
            >
              {d.date} · {d.score.total}
            </span>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <ForecastChart days={forecast.days} />
        </div>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">
        <Link href="/systems" className="underline underline-offset-4">
          System Match
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { currentAccess, hasFeature } from "@/lib/auth/access";
import { currentUserId } from "@/lib/auth/current-user";
import { formatWeekday } from "@/lib/paintday/format";
import { getZipPaintDay } from "@/lib/paintday/get-zip";
import { scoreColor } from "@/lib/paintday/score";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

function money(value: unknown) {
  const n = Number((value as { total?: number } | null)?.total);
  return Number.isFinite(n) ? `$${n.toFixed(0)}` : "—";
}

export default async function PortalPage() {
  const t = await getTranslations("app");
  const locale = await getLocale();
  const [userId, access] = await Promise.all([
    currentUserId(),
    currentAccess(),
  ]);
  const estimatePro = hasFeature(access, "estimate_pro");
  const supabase = await createClient();
  let locations: Array<{
    id: string;
    label: string;
    zip: string;
    is_default: boolean;
  }> = [];
  let jobs: Array<{ id: string; title: string; zip: string | null }> = [];
  let drafts: Array<{
    id: string;
    number: number;
    zip: string;
    totals: unknown;
    customers: { name: string } | { name: string }[] | null;
  }> = [];
  let waiting: typeof drafts = [];

  if (userId && supabase) {
    const loc = await supabase
      .from("locations")
      .select("id,label,zip,is_default")
      .order("created_at", { ascending: false })
      .limit(8);
    locations = loc.data ?? [];
    if (estimatePro) {
      const [job, est] = await Promise.all([
        supabase
          .from("jobs")
          .select("id,title,zip")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("estimates")
          .select("id,number,status,zip,totals,customers(name)")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      jobs = job.data ?? [];
      const rows = est.data ?? [];
      drafts = rows.filter((r) => r.status === "draft");
      waiting = rows.filter((r) => r.status === "sent");
    }
  }

  const home =
    locations.find((l) => l.is_default) ?? locations[0] ?? null;
  const uniqueZips = [...new Set(locations.map((l) => l.zip))];
  const byZip = new Map(
    await Promise.all(
      uniqueZips.map(async (zip) => {
        const day = await getZipPaintDay(zip);
        return [zip, day] as const;
      }),
    ),
  );
  const homeDay = home ? (byZip.get(home.zip) ?? null) : null;
  const outlook = homeDay?.forecast.days.slice(0, 10) ?? [];
  const todayScore =
    homeDay?.forecast.currentScore.total ??
    homeDay?.forecast.days[0]?.score.total ??
    null;

  const scored = locations
    .filter((loc) => loc.id !== home?.id)
    .map((loc) => {
      const day = byZip.get(loc.zip);
      return {
        ...loc,
        score:
          day?.forecast.days[0]?.score.total ??
          day?.forecast.currentScore.total ??
          null,
      };
    });

  const customerName = (row: (typeof drafts)[number]) => {
    const c = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    return c?.name ?? t("walkIn");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("dashboardTitle")}
        </h1>
        {estimatePro ? (
          <Button asChild>
            <Link href="/app/estimates/new">{t("newEstimate")}</Link>
          </Button>
        ) : null}
      </div>

      <section className="mt-8 rounded-2xl border border-border p-5">
        {home && homeDay ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {t("homeWeather")}
                </p>
                <p className="mt-1 text-lg font-medium">
                  {home.label}{" "}
                  <span className="text-muted-foreground">{home.zip}</span>
                </p>
              </div>
              <p
                className="score-numeral text-4xl font-semibold"
                style={{ color: scoreColor(todayScore ?? 0) }}
              >
                {todayScore ?? "—"}
              </p>
            </div>
            <Link
              href={`/paintday/${home.zip}`}
              className="mt-2 inline-block text-sm underline underline-offset-4"
            >
              {t("openPaintDay")}
            </Link>
            <ul className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
              {outlook.map((d) => (
                <li
                  key={d.date}
                  className="rounded-lg border border-border px-1 py-2 text-center"
                >
                  <p className="text-[10px] text-muted-foreground">
                    {formatWeekday(d.date, locale).split(",")[0]}
                  </p>
                  <p
                    className="score-numeral mt-1 text-sm font-semibold"
                    style={{ color: scoreColor(d.score.total) }}
                  >
                    {Math.round(d.score.total)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div>
            <p className="text-sm font-medium">{t("homeWeather")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("addDefaultLocation")}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/app/settings#locations">{t("addLocation")}</Link>
            </Button>
          </div>
        )}
      </section>

      {scored.length > 0 ? (
        <>
          <h2 className="mt-10 text-lg font-medium">{t("savedWeather")}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {scored.map((loc) => (
              <li key={loc.id} className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">{loc.label}</p>
                <p
                  className="score-numeral text-3xl font-semibold"
                  style={{
                    color: loc.score != null ? scoreColor(loc.score) : undefined,
                  }}
                >
                  {loc.score ?? "—"}
                </p>
                <Link
                  href={`/paintday/${loc.zip}`}
                  className="text-xs underline underline-offset-4"
                >
                  {loc.zip}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {estimatePro ? (
        <>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="text-lg font-medium">{t("openEstimates")}</h2>
              {drafts.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("noEstimates")}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                  {drafts.map((row) => (
                    <li key={row.id} className="px-4 py-3 text-sm">
                      <Link
                        href={`/app/estimates/${row.id}`}
                        className="flex justify-between gap-3 hover:underline"
                      >
                        <span>
                          #{row.number} {customerName(row)}
                        </span>
                        <span className="font-medium">{money(row.totals)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="text-lg font-medium">{t("waitingEstimates")}</h2>
              {waiting.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                  {waiting.map((row) => (
                    <li key={row.id} className="px-4 py-3 text-sm">
                      <Link
                        href={`/app/estimates/${row.id}`}
                        className="flex justify-between gap-3 hover:underline"
                      >
                        <span>
                          #{row.number} {customerName(row)}
                        </span>
                        <span className="font-medium">{money(row.totals)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <h2 className="mt-10 text-lg font-medium">{t("recentJobs")}</h2>
          {jobs.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("noJobs")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {jobs.map((job) => (
                <li key={job.id} className="px-4 py-3 text-sm">
                  <Link
                    href={`/app/jobs/${job.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {job.title}
                  </Link>{" "}
                  <span className="text-muted-foreground">{job.zip}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

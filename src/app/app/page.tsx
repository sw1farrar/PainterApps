import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyBoxIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getZipPaintDay } from "@/lib/paintday/get-zip";

export const metadata = { title: "Company portal" };

function money(value: unknown) {
  const n = Number((value as { total?: number } | null)?.total);
  return Number.isFinite(n) ? `$${n.toFixed(0)}` : "—";
}

export default async function PortalPage() {
  const t = await getTranslations("app");
  const userId = await currentUserId();
  const supabase = await createClient();
  let locations: Array<{ id: string; label: string; zip: string }> = [];
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
    const [loc, job, est] = await Promise.all([
      supabase
        .from("locations")
        .select("id,label,zip")
        .order("created_at", { ascending: false })
        .limit(6),
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
    locations = loc.data ?? [];
    jobs = job.data ?? [];
    const rows = est.data ?? [];
    drafts = rows.filter((r) => r.status === "draft");
    waiting = rows.filter((r) => r.status === "sent");
  }

  const scored = await Promise.all(
    locations.map(async (loc) => {
      const day = await getZipPaintDay(loc.zip);
      return {
        ...loc,
        score: day?.forecast.days[0]?.score.total ?? day?.forecast.currentScore.total ?? null,
      };
    }),
  );

  const customerName = (
    row: (typeof drafts)[number],
  ) => {
    const c = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    return c?.name ?? t("walkIn");
  };

  const hasWork = drafts.length + waiting.length + jobs.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("dashboardTitle")}
        </h1>
        <Button asChild>
          <Link href="/app/estimates/new">{t("newEstimate")}</Link>
        </Button>
      </div>

      {!hasWork ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <EmptyBoxIllustration />
          <p className="mt-4 text-sm text-muted-foreground">
            {t("dashboardEmpty")}
          </p>
          <Button asChild className="mt-4">
            <Link href="/app/estimates/new">{t("newEstimate")}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-lg font-medium">{t("openEstimates")}</h2>
            {drafts.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("noEstimates")}</p>
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
      )}

      <h2 className="mt-12 text-lg font-medium">{t("recentJobs")}</h2>
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

      {scored.length > 0 ? (
        <>
          <h2 className="mt-12 text-lg font-medium">{t("savedWeather")}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {scored.map((loc) => (
              <li key={loc.id} className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">{loc.label}</p>
                <p className="score-numeral text-3xl font-semibold">
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
    </div>
  );
}

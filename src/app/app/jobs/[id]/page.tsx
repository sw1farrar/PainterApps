import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { deleteJob } from "../actions";

export const metadata = { title: "Job" };

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function str(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect("/login?next=/app/jobs");
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id,title,zip,notes,weather_snapshot,system_snapshot,coverage_snapshot",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!job) notFound();

  const t = await getTranslations("app");
  const weather = asRecord(job.weather_snapshot);
  const system = asRecord(job.system_snapshot);
  const coverage = asRecord(job.coverage_snapshot);
  const primer = asRecord(system?.primer);
  const topcoat = asRecord(system?.topcoat);
  const best = Array.isArray(weather?.best) ? weather.best : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/app/jobs" className="underline underline-offset-4">
              {t("jobsTitle")}
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {job.title}
          </h1>
          {job.zip ? (
            <p className="text-sm text-muted-foreground">{job.zip}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
        <Button asChild size="sm">
          <Link href={`/app/estimates/new?job=${job.id}&zip=${job.zip ?? ""}`}>
            {t("createFromJob")}
          </Link>
        </Button>
        <form
          action={async () => {
            "use server";
            await deleteJob(job.id);
            redirect("/app/jobs");
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            {t("delete")}
          </Button>
        </form>
        </div>
      </div>

      {job.notes ? <p className="text-sm leading-relaxed">{job.notes}</p> : null}

      <section className="rounded-2xl border border-border p-5">
        <h2 className="text-sm font-medium">{t("weatherSnap")}</h2>
        {weather ? (
          <div className="mt-2 text-sm">
            <p>
              {str(weather.place) || str(weather.zip)} · {str(weather.score)}
            </p>
            {best.length > 0 ? (
              <p className="mt-1 text-muted-foreground">
                {best
                  .map((d) => {
                    const row = asRecord(d);
                    return row
                      ? `${str(row.date)} · ${str(row.score)}`
                      : "";
                  })
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {job.zip ? (
              <Link
                href={`/paintday/${job.zip}`}
                className="mt-2 inline-block text-xs underline underline-offset-4"
              >
                PaintDay
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("noSnap")}</p>
        )}
      </section>

      <section className="rounded-2xl border border-border p-5">
        <h2 className="text-sm font-medium">{t("systemSnap")}</h2>
        {system ? (
          <div className="mt-2 space-y-1 text-sm">
            <p>
              {str(system.manufacturer)} · {str(system.system)}
            </p>
            {str(system.prep) ? (
              <p className="text-muted-foreground">{str(system.prep)}</p>
            ) : null}
            {primer ? (
              <p>
                {str(primer.name)}{" "}
                {str(primer.tdsUrl) ? (
                  <a
                    href={str(primer.tdsUrl)}
                    className="underline underline-offset-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    TDS
                  </a>
                ) : null}
              </p>
            ) : null}
            {topcoat ? (
              <p>
                {str(topcoat.name)}{" "}
                {str(topcoat.tdsUrl) ? (
                  <a
                    href={str(topcoat.tdsUrl)}
                    className="underline underline-offset-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    TDS
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("noSnap")}</p>
        )}
      </section>

      <section className="rounded-2xl border border-border p-5">
        <h2 className="text-sm font-medium">{t("coverageSnap")}</h2>
        {coverage ? (
          <p className="mt-2 text-sm">
            {str(coverage.gallons)} gal / {str(coverage.litres)} L
            {str(coverage.area)
              ? ` · ${str(coverage.area)} ${str(coverage.unit)}`
              : ""}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("noSnap")}</p>
        )}
      </section>
    </div>
  );
}

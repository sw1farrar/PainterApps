import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyBoxIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { deleteJob, saveJob } from "./actions";

export const metadata = { title: "Jobs" };

export default async function JobsPage() {
  const t = await getTranslations("app");
  const userId = await currentUserId();
  const supabase = await createClient();
  const { data } =
    userId && supabase
      ? await supabase
          .from("jobs")
          .select(
            "id,title,zip,notes,weather_snapshot,system_snapshot,coverage_snapshot",
          )
          .order("created_at", { ascending: false })
      : { data: [] };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("jobsTitle")}</h1>
      <form action={saveJob} className="mt-6 space-y-3 rounded-2xl border border-border p-4">
        <Input name="title" placeholder={t("jobTitle")} required />
        <Input name="zip" placeholder={t("zip")} />
        <Textarea name="notes" placeholder={t("notes")} rows={3} />
        <Button type="submit">{t("jobTitle")}</Button>
      </form>
      {!data?.length ? (
        <div className="mt-10 text-center">
          <EmptyBoxIllustration />
          <p className="mt-3 text-sm text-muted-foreground">{t("noJobs")}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.map((job) => (
            <li key={job.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    <Link
                      href={`/app/jobs/${job.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {job.title}
                    </Link>
                  </p>
                  <p className="text-sm text-muted-foreground">{job.zip}</p>
                  {job.notes ? (
                    <p className="mt-2 text-sm">{job.notes}</p>
                  ) : null}
                  <JobSnaps
                    weather={job.weather_snapshot}
                    system={job.system_snapshot}
                    coverage={job.coverage_snapshot}
                    weatherLabel={t("weatherSnap")}
                    systemLabel={t("systemSnap")}
                    coverageLabel={t("coverageSnap")}
                  />
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteJob(job.id);
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm">
                    {t("delete")}
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function str(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function JobSnaps({
  weather,
  system,
  coverage,
  weatherLabel,
  systemLabel,
  coverageLabel,
}: {
  weather: unknown;
  system: unknown;
  coverage: unknown;
  weatherLabel: string;
  systemLabel: string;
  coverageLabel: string;
}) {
  const w = asRecord(weather);
  const s = asRecord(system);
  const c = asRecord(coverage);
  if (!w && !s && !c) return null;
  return (
    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
      {w ? (
        <li>
          {weatherLabel}: {str(w.place) || str(w.zip)} · {str(w.score)}
        </li>
      ) : null}
      {s ? (
        <li>
          {systemLabel}: {str(s.manufacturer)} · {str(s.system)}
        </li>
      ) : null}
      {c ? (
        <li>
          {coverageLabel}: {str(c.gallons)} gal / {str(c.litres)} L
        </li>
      ) : null}
    </ul>
  );
}

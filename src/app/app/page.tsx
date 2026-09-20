import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyBoxIllustration } from "@/components/illustrations";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getZipPaintDay } from "@/lib/paintday/get-zip";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const t = await getTranslations("app");
  const userId = await currentUserId();
  const supabase = await createClient();
  let locations: Array<{ id: string; label: string; zip: string }> = [];
  let jobs: Array<{ id: string; title: string; zip: string | null }> = [];

  if (userId && supabase) {
    const loc = await supabase
      .from("locations")
      .select("id,label,zip")
      .order("created_at", { ascending: false });
    locations = loc.data ?? [];
    const job = await supabase
      .from("jobs")
      .select("id,title,zip")
      .order("created_at", { ascending: false })
      .limit(8);
    jobs = job.data ?? [];
  }

  const scored = await Promise.all(
    locations.slice(0, 6).map(async (loc) => {
      const day = await getZipPaintDay(loc.zip);
      return { ...loc, score: day?.forecast.currentScore.total ?? null };
    }),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("dashboardTitle")}
      </h1>
      {scored.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <EmptyBoxIllustration />
          <p className="mt-4 text-sm text-muted-foreground">
            {t("dashboardEmpty")}
          </p>
          <Link href="/" className="mt-3 inline-block text-sm underline">
            {t("dashboardCheckZip")}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
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
    </div>
  );
}

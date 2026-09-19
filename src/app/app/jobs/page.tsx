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
          .select("id,title,zip,notes,weather_snapshot,system_snapshot")
          .eq("user_id", userId)
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
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-muted-foreground">{job.zip}</p>
                  {job.notes ? (
                    <p className="mt-2 text-sm">{job.notes}</p>
                  ) : null}
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

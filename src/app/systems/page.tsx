import { getTranslations } from "next-intl/server";
import { SystemWizard } from "@/components/systems/SystemWizard";
import { currentUnits } from "@/lib/auth/current-units";
import { currentUserId } from "@/lib/auth/current-user";
import { listMyJobs } from "@/lib/jobs/list";

export const metadata = {
  title: "System Match",
  description:
    "Ranked multi-manufacturer paint systems with TDS citations. Independent — not affiliated with any brand.",
};

export default async function SystemsPage() {
  const t = await getTranslations("systems");
  const [signedIn, units, jobs] = await Promise.all([
    currentUserId().then(Boolean),
    currentUnits(),
    listMyJobs(),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      <p className="mt-4 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        {t("disclaimer")}
      </p>
      <div className="mt-10">
        <SystemWizard signedIn={signedIn} units={units} jobs={jobs} />
      </div>
    </div>
  );
}

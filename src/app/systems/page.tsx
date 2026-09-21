import { getTranslations } from "next-intl/server";
import { SystemWizard } from "@/components/systems/SystemWizard";
import { currentUnits } from "@/lib/auth/current-units";
import { currentUserId } from "@/lib/auth/current-user";
import { listMyJobs } from "@/lib/jobs/list";

export const metadata = {
  title: "Products",
  description:
    "Primer and topcoat products by manufacturer. Independent — not affiliated with any brand.",
};

export default async function SystemsPage() {
  const t = await getTranslations("systems");
  const [signedIn, units, jobs] = await Promise.all([
    currentUserId().then(Boolean),
    currentUnits(),
    listMyJobs(),
  ]);
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-4">
      <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
      <div className="mt-3">
        <SystemWizard signedIn={signedIn} units={units} jobs={jobs} />
      </div>
    </div>
  );
}

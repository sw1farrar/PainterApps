import { getTranslations } from "next-intl/server";
import { CoverCalcForm } from "@/components/calc/CoverCalcForm";
import { currentAccess, hasFeature } from "@/lib/auth/access";
import { currentUnits } from "@/lib/auth/current-units";
import { currentUserId } from "@/lib/auth/current-user";
import { listMyJobs } from "@/lib/jobs/list";
import { areaUnitFor } from "@/lib/units";

export const metadata = {
  title: "CoverCalc",
  description:
    "Coverage calculator for painters — gallons and litres from area, porosity, coats, and waste.",
};

export default async function CalcPage() {
  const t = await getTranslations("calc");
  const [signedIn, units, jobs, access] = await Promise.all([
    currentUserId().then(Boolean),
    currentUnits(),
    listMyJobs(),
    currentAccess(),
  ]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-10">
        <CoverCalcForm
          signedIn={signedIn}
          canSnapshot={hasFeature(access, "estimate_pro")}
          initialUnit={areaUnitFor(units)}
          jobs={jobs}
        />
      </div>
    </div>
  );
}

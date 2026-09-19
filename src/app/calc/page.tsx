import { getTranslations } from "next-intl/server";
import { CoverCalcForm } from "@/components/calc/CoverCalcForm";

export const metadata = {
  title: "CoverCalc",
  description:
    "Coverage calculator for painters — gallons and litres from area, porosity, coats, and waste.",
};

export default async function CalcPage() {
  const t = await getTranslations("calc");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-10">
        <CoverCalcForm />
      </div>
    </div>
  );
}

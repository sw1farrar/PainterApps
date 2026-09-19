import { getTranslations } from "next-intl/server";
import { PaintDayMap } from "@/components/paintday/PaintDayMap";
import { ZipSearch } from "@/components/paintday/ZipSearch";
import { getMapScores } from "@/lib/paintday/map-scores";

export const metadata = {
  title: "PaintDay",
  description: "National paint-weather map and ZIP lookup for the United States.",
};

export default async function PaintDayPage() {
  const t = await getTranslations("paintday");
  const points = await getMapScores();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-6 max-w-lg">
        <ZipSearch />
      </div>
      <div className="mt-8">
        <PaintDayMap points={points} />
      </div>
    </div>
  );
}

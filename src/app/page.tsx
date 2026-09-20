import { getTranslations } from "next-intl/server";
import { HomeMapBoard } from "@/components/paintday/HomeMapBoard";
import { getMapBoard } from "@/lib/paintday/map-scores";

export default async function HomePage() {
  const t = await getTranslations();
  const board = await getMapBoard();

  return (
    <section className="bg-card/40 py-6">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="sr-only">{t("landing.mapTitle")}</h1>
        <HomeMapBoard board={board} />
      </div>
    </section>
  );
}

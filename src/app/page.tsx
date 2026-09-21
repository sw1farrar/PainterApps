import { getLocale } from "next-intl/server";
import { HomeMapBoard } from "@/components/paintday/HomeMapBoard";
import { getMapBoard } from "@/lib/paintday/map-scores";
import type { MapBoard } from "@/lib/paintday/map-scores";
import { homeMapCopy } from "@/lib/paintday/ui-copy";

export const revalidate = 900;

const EMPTY_BOARD: MapBoard = { dates: [], metros: [] };

export default async function HomePage() {
  const [locale, copy] = await Promise.all([getLocale(), homeMapCopy()]);
  let board = EMPTY_BOARD;
  try {
    board = await getMapBoard();
  } catch (error) {
    console.error("PaintDay map board failed", error);
  }

  return (
    <section className="bg-card/40 py-6">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4">
        <HomeMapBoard board={board} locale={locale} copy={copy} />
      </div>
    </section>
  );
}

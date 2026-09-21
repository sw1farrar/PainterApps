"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ZipSearch } from "@/components/paintday/ZipSearch";
import { PaintDayMap } from "@/components/paintday/PaintDayMap";
import { formatWeekday } from "@/lib/paintday/format";
import { cn } from "@/lib/utils";
import {
  pointsForDay,
  type MapBoard,
} from "@/lib/paintday/map-scores";

export function HomeMapBoard({ board }: { board: MapBoard }) {
  const t = useTranslations("landing");
  const locale = useLocale();
  const [day, setDay] = useState(0);
  const last = board.dates.length - 1;
  const labels = useMemo(
    () =>
      board.dates.map((iso, i) =>
        i === 0
          ? `${t("mapToday")} · ${formatWeekday(iso, locale)}`
          : i === 1
            ? `${t("mapTomorrow")} · ${formatWeekday(iso, locale)}`
            : formatWeekday(iso, locale),
      ),
    [board.dates, locale, t],
  );
  const points = useMemo(() => pointsForDay(board, day), [board, day]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-4">
        <div className="flex shrink-0 flex-nowrap items-center gap-0.5">
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            disabled={day === 0}
            onClick={() => setDay(0)}
          >
            {t("mapToday")}
          </button>
          <button
            type="button"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label={t("mapPrevDay")}
            disabled={day <= 0}
            onClick={() => setDay((d) => Math.max(0, d - 1))}
          >
            <ChevronLeft className="size-5" />
          </button>
          <div
            className="grid justify-items-center"
            aria-live="polite"
          >
            {labels.map((text, i) => (
              <p
                key={board.dates[i] ?? i}
                className={cn(
                  "col-start-1 row-start-1 whitespace-nowrap text-center text-sm font-medium tabular-nums leading-5",
                  i === day ? "visible" : "invisible",
                )}
                aria-hidden={i !== day}
              >
                {text}
              </p>
            ))}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label={t("mapNextDay")}
            disabled={day >= last}
            onClick={() => setDay((d) => Math.min(last, d + 1))}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <h1
          aria-label={t("mapHeading")}
          className="justify-self-center text-center sm:px-2"
        >
          <span className="block whitespace-nowrap text-[1.35rem] font-semibold leading-none tracking-[-0.05em] text-foreground sm:text-[1.85rem] lg:text-[2.15rem]">
            Paint{" "}
            <span className="bg-gradient-to-r from-[oklch(0.62_0.16_175)] to-[oklch(0.58_0.16_155)] bg-clip-text text-transparent dark:from-[oklch(0.78_0.13_170)] dark:to-[oklch(0.7_0.14_155)]">
              Weather
            </span>{" "}
            Day
          </span>
          <span
            aria-hidden
            className="paint-gradient mx-auto mt-2 block h-[3px] w-14 rounded-full opacity-90"
          />
        </h1>
        <div className="min-w-0 sm:max-w-md sm:justify-self-end">
          <ZipSearch size="hero" />
        </div>
      </div>
      <div className="mt-4">
        <PaintDayMap points={points} />
      </div>
    </>
  );
}

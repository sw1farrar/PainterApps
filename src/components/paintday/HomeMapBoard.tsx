"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MapCityEnvelope } from "@/components/paintday/MapCityEnvelope";
import { ZipSearch } from "@/components/paintday/ZipSearch";
import { PaintDayMap } from "@/components/paintday/PaintDayMap";
import type { HomeMapCopy } from "@/lib/paintday/copy-types";
import { formatWeekday } from "@/lib/paintday/format";
import { cn } from "@/lib/utils";
import {
  pointsForDay,
  type MapBoard,
} from "@/lib/paintday/map-scores";

export type { HomeMapCopy };

export function HomeMapBoard({
  board,
  locale,
  copy,
}: {
  board: MapBoard;
  locale: string;
  copy: HomeMapCopy;
}) {
  const [day, setDay] = useState(0);
  const [open, setOpen] = useState<{
    zip: string;
    date: string;
    city: string;
    state: string;
  } | null>(null);
  const last = Math.max(0, board.dates.length - 1);
  const labels = useMemo(
    () =>
      board.dates.map((iso, i) =>
        i === 0
          ? `${copy.mapToday} · ${formatWeekday(iso, locale)}`
          : i === 1
            ? `${copy.mapTomorrow} · ${formatWeekday(iso, locale)}`
            : formatWeekday(iso, locale),
      ),
    [board.dates, copy.mapToday, copy.mapTomorrow, locale],
  );
  const points = useMemo(() => pointsForDay(board, day), [board, day]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-0.5">
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            disabled={day === 0}
            onClick={() => setDay(0)}
          >
            {copy.mapToday}
          </button>
          <button
            type="button"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label={copy.mapPrevDay}
            disabled={day <= 0}
            onClick={() => setDay((d) => Math.max(0, d - 1))}
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="grid justify-items-center" aria-live="polite">
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
            aria-label={copy.mapNextDay}
            disabled={day >= last}
            onClick={() => setDay((d) => Math.min(last, d + 1))}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <h1
          aria-label={copy.mapHeading}
          className="justify-self-center text-center sm:px-2"
        >
          <span className="block text-[1.35rem] font-semibold leading-none tracking-[-0.05em] text-foreground sm:whitespace-nowrap sm:text-[1.85rem] lg:text-[2.15rem]">
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
          <ZipSearch size="hero" copy={copy.zip} />
        </div>
      </div>
      <div className="mt-4">
        <PaintDayMap
          points={points}
          summaries={copy.summaries}
          onOpen={setOpen}
        />
      </div>
      {open ? (
        <MapCityEnvelope
          zip={open.zip}
          date={open.date}
          city={open.city}
          state={open.state}
          closeLabel={copy.close}
          loadingLabel={copy.loadingForecast}
          missLabel={copy.forecastMiss}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

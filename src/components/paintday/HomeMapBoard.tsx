"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ZipSearch } from "@/components/paintday/ZipSearch";
import { PaintDayMap } from "@/components/paintday/PaintDayMap";
import { formatWeekday } from "@/lib/paintday/format";
import {
  pointsForDay,
  type MapBoard,
} from "@/lib/paintday/map-scores";

export function HomeMapBoard({ board }: { board: MapBoard }) {
  const t = useTranslations("landing");
  const locale = useLocale();
  const [day, setDay] = useState(0);
  const last = board.dates.length - 1;
  const iso = board.dates[day] ?? board.dates[0];
  const label =
    day === 0
      ? `${t("mapToday")} · ${formatWeekday(iso, locale)}`
      : day === 1
        ? `${t("mapTomorrow")} · ${formatWeekday(iso, locale)}`
        : formatWeekday(iso, locale);
  const points = useMemo(() => pointsForDay(board, day), [board, day]);

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <ZipSearch size="hero" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-0.5">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            disabled={day === 0}
            onClick={() => setDay(0)}
          >
            {t("mapToday")}
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label={t("mapPrevDay")}
            disabled={day <= 0}
            onClick={() => setDay((d) => Math.max(0, d - 1))}
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="whitespace-nowrap text-right text-sm font-medium tabular-nums leading-5">
            {label}
          </p>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label={t("mapNextDay")}
            disabled={day >= last}
            onClick={() => setDay((d) => Math.min(last, d + 1))}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      <div className="mt-6">
        <PaintDayMap points={points} />
      </div>
    </>
  );
}

import { formatClock, hourCall, type HourSlot } from "@/lib/paintday/crew-plan";
import { formatTemp, rainLabel } from "@/lib/paintday/format";
import { fToC, type UnitSystem } from "@/lib/units";

/** Hour cells are ~24px wide on a phone, so the unit letter only fits from `sm` up. */
function compactTemp(tempF: number, units: UnitSystem) {
  const n = units === "metric" ? fToC(tempF) : Math.round(tempF);
  return `${n}°`;
}

export function HourlyStrip({
  hours,
  nowHour,
  units = "imperial",
}: {
  hours: HourSlot[];
  nowHour?: number;
  units?: UnitSystem;
}) {
  if (!hours.length) return null;
  return (
    <div className="flex w-full min-w-0 gap-0.5">
      {hours.map((slot) => {
        const call = hourCall(slot);
        const now = slot.hour === nowHour;
        const color =
          call === "NO"
            ? "var(--color-score-bad)"
            : call === "WAIT"
              ? "var(--color-score-fair)"
              : "var(--color-score-excellent)";
        return (
          <div
            key={slot.time}
            className={`min-w-0 flex-1 overflow-hidden rounded-md border px-0.5 py-1 text-center ${
              now ? "border-foreground" : "border-border"
            }`}
          >
            <p className="text-[10px] leading-none text-muted-foreground">
              {formatClock(slot.hour)}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-semibold leading-none tabular-nums sm:text-[11px]">
              <span className="sm:hidden">
                {compactTemp(slot.snapshot.tempF, units)}
              </span>
              <span className="hidden sm:inline">
                {formatTemp(slot.snapshot.tempF, units)}
              </span>
            </p>
            <p className="text-[11px] font-semibold leading-tight" style={{ color }}>
              {call}
            </p>
            <p className="truncate text-[10px] leading-none text-muted-foreground">
              {rainLabel(slot.snapshot)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

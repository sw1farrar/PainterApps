import { formatClock, hourCall, type HourSlot } from "@/lib/paintday/crew-plan";
import { rainLabel } from "@/lib/paintday/format";

export function HourlyStrip({
  hours,
  nowHour,
}: {
  hours: HourSlot[];
  nowHour?: number;
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
            className={`min-w-0 flex-1 rounded-md border px-0.5 py-1 text-center ${
              now ? "border-foreground" : "border-border"
            }`}
          >
            <p className="text-[10px] leading-none text-muted-foreground">
              {formatClock(slot.hour)}
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

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
    <div className="flex gap-1 overflow-x-auto pb-1">
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
            className={`min-w-14 shrink-0 rounded-lg border px-1.5 py-2 text-center ${
              now ? "border-foreground" : "border-border"
            }`}
          >
            <p className="text-[10px] text-muted-foreground">
              {formatClock(slot.hour)}
            </p>
            <p className="text-xs font-semibold" style={{ color }}>
              {call}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {rainLabel(slot.snapshot)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

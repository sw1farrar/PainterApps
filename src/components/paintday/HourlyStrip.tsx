import { formatClock, slotIsOpen, type HourSlot } from "@/lib/paintday/crew-plan";
import { verdictFor } from "@/lib/paintday/format";
import { scoreColor } from "@/lib/paintday/score";

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
        const v = verdictFor(slot.score.band);
        const open = slotIsOpen(slot);
        const now = slot.hour === nowHour;
        return (
          <div
            key={slot.time}
            className={`min-w-12 shrink-0 rounded-lg border px-1.5 py-2 text-center ${
              now ? "border-foreground" : "border-border"
            }`}
          >
            <p className="text-[10px] text-muted-foreground">
              {formatClock(slot.hour)}
            </p>
            <p
              className="score-numeral text-sm font-semibold"
              style={{ color: scoreColor(slot.score.total) }}
            >
              {slot.score.total}
            </p>
            <p className="text-[10px] font-medium">
              {open ? "GO" : v === "no" ? "NO" : "WAIT"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

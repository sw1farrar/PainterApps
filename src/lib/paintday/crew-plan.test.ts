import { describe, expect, it } from "vitest";
import { buildCrewPlan, formatClock, slotIsOpen, type HourSlot } from "./crew-plan";
import { LATITUDE_WINDOW } from "./product-window";
import { scorePaintDay } from "./score";

function slot(hour: number, precipMm = 0, precipProbability = 5): HourSlot {
  const snapshot = {
    precipProbability,
    precipMm,
    humidity: 50,
    tempF: 72,
    dewPointF: 50,
    windMph: 5,
    minTempNext48hF: 55,
  };
  return {
    time: `2026-09-19T${String(hour).padStart(2, "0")}:00`,
    date: "2026-09-19",
    hour,
    snapshot,
    score: scorePaintDay(snapshot),
  };
}

describe("crew plan", () => {
  it("opens 9am and wraps before rain", () => {
    const slots = [
      slot(8, 0, 5),
      slot(9, 0, 5),
      slot(10, 0, 5),
      slot(11, 0, 5),
      slot(12, 0, 5),
      slot(13, 2, 80),
      slot(14, 3, 90),
    ];
    const plan = buildCrewPlan(slots, 8);
    expect(plan.startHour).toBe(8);
    expect(plan.wrapHour).toBe(9);
    expect(plan.hoursOpen).toBe(2);
    expect(plan.secondCoat).toBe(false);
    expect(plan.rainHour).toBe(13);
  });

  it("lets Latitude paint closer to afternoon rain", () => {
    const slots = [
      slot(8, 0, 5),
      slot(9, 0, 5),
      slot(10, 0, 5),
      slot(11, 0, 5),
      slot(12, 0, 5),
      slot(13, 2, 80),
    ];
    const plan = buildCrewPlan(slots, 8, LATITUDE_WINDOW);
    expect(plan.wrapHour).toBe(12);
    expect(plan.hoursOpen).toBe(5);
    expect(plan.secondCoat).toBe(true);
    expect(plan.rainHour).toBe(13);
  });

  it("rejects a wet hour", () => {
    expect(slotIsOpen(slot(10, 1, 20))).toBe(false);
  });

  it("formats clocks", () => {
    expect(formatClock(9)).toBe("9am");
    expect(formatClock(12)).toBe("12pm");
    expect(formatClock(14)).toBe("2pm");
  });
});

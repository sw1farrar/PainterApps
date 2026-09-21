import { describe, expect, it } from "vitest";
import type { Forecast } from "@/lib/weather/types";
import {
  DRIZZLE_CAUTION_CAP,
  dayDisplayTotal,
  dayFitTotal,
  forecastDayForNow,
  localIsoDate,
} from "./today";

describe("forecastDayForNow", () => {
  it("picks the local calendar day, not days[0] when they differ", () => {
    const iso = localIsoDate("UTC");
    const forecast = {
      timezone: "UTC",
      days: [
        { date: "1999-01-01", score: { total: 11 } },
        { date: iso, score: { total: 88 } },
        { date: "2099-01-01", score: { total: 40 } },
      ],
    } as Forecast;
    expect(forecastDayForNow(forecast)?.score.total).toBe(88);
  });

  it("caps AM-rain days at 22", () => {
    const iso = localIsoDate("UTC");
    const forecast = {
      timezone: "UTC",
      days: [{ date: iso, score: { total: 91 }, amWet: true }],
    } as Forecast;
    expect(dayFitTotal(forecast)).toBe(22);
  });

  it("caps afternoon-open drizzle days at orange caution", () => {
    const iso = localIsoDate("UTC");
    const day = {
      date: iso,
      score: { total: 91 },
      amWet: true,
      pmWet: false,
      hoursOpen: 6,
    };
    const forecast = { timezone: "UTC", days: [day] } as Forecast;
    expect(dayDisplayTotal(day)).toBe(DRIZZLE_CAUTION_CAP);
    expect(dayFitTotal(forecast)).toBe(DRIZZLE_CAUTION_CAP);
  });
});

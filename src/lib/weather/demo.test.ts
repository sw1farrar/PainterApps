import { describe, expect, it } from "vitest";
import { localIsoDate } from "@/lib/paintday/today";
import { DemoWeatherProvider } from "./demo";

describe("DemoWeatherProvider dates", () => {
  it("uses the Denver calendar, not UTC ISO", async () => {
    const forecast = await new DemoWeatherProvider().getForecast(39.74, -104.99);
    expect(forecast.days[0]?.date).toBe(localIsoDate("America/Denver"));
    expect(forecast.timezone).toBe("America/Denver");
    expect(forecast.days[0]?.windowHour).toBe(10);
  });
});

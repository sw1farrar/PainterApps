import { describe, expect, it } from "vitest";
import {
  weatherBugDetailsUrl,
  weatherBugHourlyUrl,
  weatherBugRadarUrl,
  weatherBugTenDayUrl,
} from "./radar";

describe("WeatherBug ZIP urls", () => {
  it("uses the ZIP slug so WeatherBug can canonicalize the city", () => {
    expect(weatherBugRadarUrl("44503")).toBe(
      "https://www.weatherbug.com/maps/44503?layerId=radar",
    );
    expect(weatherBugDetailsUrl("44503")).toBe(
      "https://www.weatherbug.com/weather-forecast/now/44503",
    );
    expect(weatherBugHourlyUrl("44503")).toBe(
      "https://www.weatherbug.com/weather-forecast/hourly/44503",
    );
    expect(weatherBugTenDayUrl("80521-1234")).toBe(
      "https://www.weatherbug.com/weather-forecast/10-day-weather/80521",
    );
  });
});

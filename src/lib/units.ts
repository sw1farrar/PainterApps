export const unitSystems = ["imperial", "metric"] as const;
export type UnitSystem = (typeof unitSystems)[number];

export function isUnitSystem(value: unknown): value is UnitSystem {
  return value === "imperial" || value === "metric";
}

export function fToC(tempF: number) {
  return Math.round(((tempF - 32) * 5) / 9);
}

export function formatTempRange(
  minF: number,
  maxF: number,
  units: UnitSystem,
) {
  if (units === "metric") return `${fToC(minF)}–${fToC(maxF)}°C`;
  return `${minF}–${maxF}°F`;
}

export function areaUnitFor(units: UnitSystem) {
  return units === "metric" ? "sqm" : "sqft";
}

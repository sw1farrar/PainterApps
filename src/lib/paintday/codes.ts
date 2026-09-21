/** WMO weather interpretation codes (Open-Meteo). */
export function precipKind(code?: number): "none" | "drizzle" | "rain" | "snow" | "storm" {
  if (code == null) return "none";
  if (code >= 95) return "storm";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 66 && code <= 67) return "rain";
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 56 && code <= 57) return "rain";
  if (code >= 51 && code <= 57) return "drizzle";
  return "none";
}

export function isWetCode(code?: number) {
  const kind = precipKind(code);
  return kind === "rain" || kind === "storm" || kind === "snow";
}

/** Storm, snow, or ice — wet even at 0 mm. Rain/drizzle codes at 0 mm are not. */
export function isHardPrecip(code?: number, precipMm = 0) {
  const kind = precipKind(code);
  if (kind === "storm" || kind === "snow") return true;
  if (code != null && ((code >= 56 && code <= 57) || (code >= 66 && code <= 67))) {
    return true;
  }
  return precipMm >= 0.2;
}

import type { QuoteJobType, QuoteSurfaceKind, QuoteRateType } from "@/types/database";

export type ScopeLibraryItem = {
  id: string;
  label: string;
  category: "prep" | "paint" | "extras";
  jobTypes?: QuoteJobType[];
};

/** Per-area scope comments painters can quick-check. Stored in room prep_work. */
export const AREA_SCOPE_LIBRARY: ScopeLibraryItem[] = [
  { id: "furniture-cover", label: "Furniture & floor protection", category: "prep" },
  { id: "caulking", label: "Caulk gaps, cracks & joints", category: "prep" },
  { id: "patch-repair", label: "Patch holes & wall repair", category: "prep" },
  { id: "sand-prep", label: "Sand & prep for smooth finish", category: "prep" },
  { id: "spot-prime", label: "Spot prime bare areas", category: "prep" },
  { id: "masking", label: "Mask windows, trim & fixtures", category: "prep" },
  { id: "pressure-wash", label: "Pressure wash (exterior)", category: "prep", jobTypes: ["exterior", "both"] },
  { id: "two-coats", label: "Two full coats", category: "paint" },
  { id: "cut-in", label: "Cut-in at ceilings & trim", category: "paint" },
  { id: "ceiling-included", label: "Ceiling paint included", category: "paint" },
  { id: "trim-doors", label: "Trim & doors included", category: "paint" },
  { id: "color-match", label: "Color match & touch-up", category: "extras" },
  { id: "cleanup", label: "Daily cleanup & walkthrough", category: "extras" },
];

export type SurfaceScopeOption = {
  id: string;
  label: string;
  surface_type: QuoteSurfaceKind;
  rate_type: QuoteRateType;
};

export const SURFACE_SCOPE_OPTIONS: SurfaceScopeOption[] = [
  { id: "walls", label: "Walls", surface_type: "wall", rate_type: "sqft" },
  { id: "ceiling", label: "Ceiling", surface_type: "ceiling", rate_type: "sqft" },
  { id: "trim", label: "Trim", surface_type: "trim", rate_type: "linear" },
  { id: "windows", label: "Windows", surface_type: "window", rate_type: "each" },
];

export function parseScopeLines(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function joinScopeLines(lines: string[]): string {
  return lines.join("\n");
}

export function toggleScopeLine(
  current: string | null | undefined,
  label: string,
  enabled: boolean,
): string {
  const lines = parseScopeLines(current);
  const exists = lines.includes(label);
  if (enabled && !exists) return joinScopeLines([...lines, label]);
  if (!enabled && exists) {
    return joinScopeLines(lines.filter((line) => line !== label));
  }
  return joinScopeLines(lines);
}

export function scopeLibraryForJobType(jobType: QuoteJobType): ScopeLibraryItem[] {
  return AREA_SCOPE_LIBRARY.filter(
    (item) =>
      !item.jobTypes ||
      item.jobTypes.includes(jobType) ||
      (jobType === "specialty" && !item.jobTypes),
  );
}
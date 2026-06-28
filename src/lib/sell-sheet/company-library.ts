export function parseSellSheetLibrary(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const items: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const normalized = normalizeLibraryLabel(entry);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    items.push(normalized);
  }

  return items;
}

export function normalizeLibraryLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function isValidLibraryLabel(value: string): boolean {
  const normalized = normalizeLibraryLabel(value);
  return normalized.length > 0 && normalized.length <= 120;
}
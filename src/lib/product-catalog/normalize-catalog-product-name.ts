/** Normalize product names for catalog matching and display fallbacks. */
export function normalizeCatalogProductName(name: string): string {
  return name
    .trim()
    .replace(/\.+$/g, "")
    .replace(/\s+/g, " ");
}

export function catalogProductNamesMatch(left: string, right: string): boolean {
  const a = normalizeCatalogProductName(left).toLowerCase();
  const b = normalizeCatalogProductName(right).toLowerCase();
  return Boolean(a && b && a === b);
}
/**
 * Interpolate `{key}` placeholders in translated strings.
 * Use the same placeholder names in en.ts and es.ts for every template.
 */
export function formatMessage(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value !== undefined ? String(value) : match;
  });
}

export function extractPlaceholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
}
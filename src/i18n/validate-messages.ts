import { extractPlaceholders } from "@/i18n/format";
import type { Locale, Messages } from "@/i18n/types";

type MessageTree = Messages | string | Record<string, unknown>;

function collectStringPaths(
  tree: MessageTree,
  prefix = "",
): { path: string; value: string }[] {
  if (typeof tree === "string") {
    return [{ path: prefix, value: tree }];
  }

  return Object.entries(tree).flatMap(([key, value]) =>
    collectStringPaths(value as MessageTree, prefix ? `${prefix}.${key}` : key),
  );
}

/**
 * Ensures every translated string uses identical `{placeholder}` tokens
 * across locales so Spanish cannot drift from the English source structure.
 */
export function assertMessageParity(
  catalog: Record<Locale, Messages>,
): void {
  const locales = Object.keys(catalog) as Locale[];
  const [baseLocale, ...otherLocales] = locales;
  const baseStrings = collectStringPaths(catalog[baseLocale]);
  const placeholderMap = new Map<string, string>();

  for (const { path, value } of baseStrings) {
    const placeholders = extractPlaceholders(value).sort().join(",");
    placeholderMap.set(path, placeholders);
  }

  for (const locale of otherLocales) {
    const localeStrings = collectStringPaths(catalog[locale]);
    const localePaths = new Set(localeStrings.map((entry) => entry.path));

    for (const { path } of baseStrings) {
      if (!localePaths.has(path)) {
        throw new Error(
          `[i18n] Missing translation path "${path}" in locale "${locale}".`,
        );
      }
    }

    for (const { path, value } of localeStrings) {
      const expected = placeholderMap.get(path);
      if (expected === undefined) {
        throw new Error(
          `[i18n] Extra translation path "${path}" in locale "${locale}".`,
        );
      }

      const actual = extractPlaceholders(value).sort().join(",");
      if (actual !== expected) {
        throw new Error(
          `[i18n] Placeholder mismatch at "${path}" (${baseLocale} vs ${locale}): expected {${expected.replace(/,/g, "}, {")}}, got {${actual.replace(/,/g, "}, {")}}.`,
        );
      }
    }
  }
}
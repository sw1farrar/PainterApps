import { defaultLocale, locales, type Locale } from "./config";

export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;
  const ranked = header.split(",").map((part) => {
    const [tagRaw, ...params] = part.trim().split(";");
    const tag = (tagRaw ?? "").trim().toLowerCase();
    const q = params.find((p) => p.trim().startsWith("q="));
    const quality = q ? Number(q.trim().slice(2)) || 0 : 1;
    return { tag, quality };
  });
  ranked.sort((a, b) => b.quality - a.quality);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0] ?? "";
    if (locales.includes(base as Locale)) return base as Locale;
  }
  return defaultLocale;
}

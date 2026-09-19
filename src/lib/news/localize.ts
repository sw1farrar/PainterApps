import type { Locale } from "@/i18n/config";
import type { LocalizedPost, NewsPost } from "./types";

export function localizePost(post: NewsPost, locale: Locale): LocalizedPost {
  const pick = <T extends { en: string; es: string }>(field: T) =>
    (locale === "es" && field.es.trim() ? field.es : field.en).trim();

  return {
    id: post.id,
    slug: post.slug,
    category: post.category,
    publishedAt: post.publishedAt,
    sourceUrl: post.sourceUrl,
    title: pick(post.title),
    excerpt: pick(post.excerpt),
    body: pick(post.body),
  };
}

export function formatNewsDate(iso: string, locale: Locale) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    dateStyle: "medium",
    timeZone: "America/Chicago",
  }).format(date);
}

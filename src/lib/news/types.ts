export const NEWS_CATEGORIES = [
  "weather",
  "specs",
  "industry",
  "regulation",
  "field",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type NewsPost = {
  id: string;
  slug: string;
  category: NewsCategory;
  published: boolean;
  publishedAt: string;
  sourceUrl?: string;
  title: { en: string; es: string };
  excerpt: { en: string; es: string };
  body: { en: string; es: string };
  origin: "seed" | "db";
};

export type LocalizedPost = {
  id: string;
  slug: string;
  category: NewsCategory;
  publishedAt: string;
  sourceUrl?: string;
  title: string;
  excerpt: string;
  body: string;
};

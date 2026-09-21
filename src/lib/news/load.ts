import { createClient, supabaseAdmin } from "@/lib/supabase/server";
import type { NewsCategory, NewsPost } from "./types";
import { NEWS_CATEGORIES } from "./types";

function isCategory(value: string): value is NewsCategory {
  return (NEWS_CATEGORIES as readonly string[]).includes(value);
}

function fromRow(row: Record<string, unknown>): NewsPost | null {
  const slug = String(row.slug ?? "");
  const category = String(row.category ?? "");
  if (!slug || !isCategory(category)) return null;
  return {
    id: String(row.id),
    slug,
    category,
    published: Boolean(row.published),
    publishedAt: String(row.published_at ?? row.created_at ?? ""),
    sourceUrl: row.source_url ? String(row.source_url) : undefined,
    title: {
      en: String(row.title_en ?? ""),
      es: String(row.title_es ?? ""),
    },
    excerpt: {
      en: String(row.excerpt_en ?? ""),
      es: String(row.excerpt_es ?? ""),
    },
    body: {
      en: String(row.body_en ?? ""),
      es: String(row.body_es ?? ""),
    },
    origin: "db",
  };
}

async function newsDb() {
  return supabaseAdmin() ?? (await createClient());
}

async function dbPosts(): Promise<NewsPost[]> {
  const db = await newsDb();
  if (!db) return [];
  try {
    const query = db
      .from("news_posts")
      .select(
        "id,slug,category,published,published_at,source_url,title_en,title_es,excerpt_en,excerpt_es,body_en,body_es,created_at",
      )
      .order("published_at", { ascending: false });
    const { data, error } = await Promise.race([
      query,
      new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(
          () => resolve({ data: null, error: new Error("timeout") }),
          4000,
        ),
      ),
    ]);
    if (error || !data) return [];
    return data
      .map((row) => fromRow(row as Record<string, unknown>))
      .filter((p): p is NewsPost => Boolean(p));
  } catch {
    return [];
  }
}

export async function listNews(opts?: { includeDrafts?: boolean }) {
  const posts = await dbPosts();
  if (opts?.includeDrafts) return posts;
  return posts.filter((p) => p.published);
}

export async function getNewsBySlug(slug: string) {
  return (await listNews()).find((p) => p.slug === slug) ?? null;
}

export async function getNewsById(id: string) {
  return (await listNews({ includeDrafts: true })).find((p) => p.id === id) ?? null;
}

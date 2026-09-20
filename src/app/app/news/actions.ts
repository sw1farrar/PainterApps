"use server";

import { revalidatePath } from "next/cache";
import { NEWS_CATEGORIES, type NewsCategory } from "@/lib/news/types";
import { requireNewsEditor } from "@/lib/news/editors";
import { slugify } from "@/lib/news/slug";
import { createClient, supabaseAdmin } from "@/lib/supabase/server";

async function newsDb() {
  return supabaseAdmin() ?? (await createClient());
}

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function parseCategory(value: string): NewsCategory {
  return (NEWS_CATEGORIES as readonly string[]).includes(value)
    ? (value as NewsCategory)
    : "industry";
}

function revalidateNews(slug?: string) {
  revalidatePath("/news");
  revalidatePath("/app/news");
  revalidatePath("/");
  if (slug) revalidatePath(`/news/${slug}`);
}

export async function saveNewsPost(formData: FormData) {
  const editorId = await requireNewsEditor();
  const db = await newsDb();
  if (!editorId || !db) return { error: "forbidden" };

  const id = str(formData, "id");
  const titleEn = str(formData, "title_en");
  if (!titleEn) return { error: "title" };

  const slug = slugify(str(formData, "slug") || titleEn);
  if (!slug) return { error: "slug" };

  const published = str(formData, "published") === "on";
  const publishedAt =
    str(formData, "published_at") || new Date().toISOString();

  const payload = {
    slug,
    category: parseCategory(str(formData, "category")),
    published,
    published_at: published ? publishedAt : null,
    source_url: str(formData, "source_url") || null,
    title_en: titleEn,
    title_es: str(formData, "title_es"),
    excerpt_en: str(formData, "excerpt_en"),
    excerpt_es: str(formData, "excerpt_es"),
    body_en: str(formData, "body_en"),
    body_es: str(formData, "body_es"),
    author_user_id: editorId,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await db.from("news_posts").update(payload).eq("id", id);
    if (error) return { error: "save" };
  } else {
    const { error } = await db.from("news_posts").upsert(payload, {
      onConflict: "slug",
    });
    if (error) return { error: "save" };
  }

  revalidateNews(slug);
  return { ok: true, slug };
}

export async function deleteNewsPost(id: string, slug: string) {
  const editorId = await requireNewsEditor();
  const db = await newsDb();
  if (!editorId || !db) return;
  await db.from("news_posts").delete().eq("id", id);
  revalidateNews(slug);
}

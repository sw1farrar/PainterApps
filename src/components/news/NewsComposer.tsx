"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NEWS_CATEGORIES, type NewsPost } from "@/lib/news/types";
import { slugify } from "@/lib/news/slug";
import { saveNewsPost } from "@/app/app/news/actions";

export function NewsComposer({ post }: { post?: NewsPost }) {
  const t = useTranslations("news");
  const [titleEn, setTitleEn] = useState(post?.title.en ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const slug = useMemo(
    () => post?.slug || slugify(titleEn) || "untitled",
    [post?.slug, titleEn],
  );

  async function onSubmit(formData: FormData) {
    setStatus(null);
    const result = await saveNewsPost(formData);
    if (result?.error) setStatus(t("saveError"));
    else setStatus(t("saved"));
  }

  return (
    <form action={onSubmit} className="space-y-6 rounded-2xl border border-border p-5">
      {post?.origin === "db" ? (
        <input type="hidden" name="id" value={post.id} />
      ) : null}
      <input type="hidden" name="slug" value={slug} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="title_en">{t("fields.titleEn")}</Label>
          <Input
            id="title_en"
            name="title_en"
            className="mt-2"
            required
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="title_es">{t("fields.titleEs")}</Label>
          <Input
            id="title_es"
            name="title_es"
            className="mt-2"
            defaultValue={post?.title.es}
          />
        </div>
      </div>

      <p className="font-mono text-xs text-muted-foreground">/news/{slug}</p>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="category">{t("fields.category")}</Label>
          <select
            id="category"
            name="category"
            defaultValue={post?.category ?? "industry"}
            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {NEWS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="published_at">{t("fields.date")}</Label>
          <Input
            id="published_at"
            name="published_at"
            type="datetime-local"
            className="mt-2"
            defaultValue={
              post?.publishedAt
                ? post.publishedAt.slice(0, 16)
                : new Date().toISOString().slice(0, 16)
            }
          />
        </div>
        <div>
          <Label htmlFor="source_url">{t("fields.source")}</Label>
          <Input
            id="source_url"
            name="source_url"
            className="mt-2"
            defaultValue={post?.sourceUrl}
            placeholder="https://"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="excerpt_en">{t("fields.excerptEn")}</Label>
          <Textarea
            id="excerpt_en"
            name="excerpt_en"
            className="mt-2"
            rows={3}
            defaultValue={post?.excerpt.en}
          />
        </div>
        <div>
          <Label htmlFor="excerpt_es">{t("fields.excerptEs")}</Label>
          <Textarea
            id="excerpt_es"
            name="excerpt_es"
            className="mt-2"
            rows={3}
            defaultValue={post?.excerpt.es}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="body_en">{t("fields.bodyEn")}</Label>
          <Textarea
            id="body_en"
            name="body_en"
            className="mt-2 font-mono text-sm"
            rows={14}
            required
            defaultValue={post?.body.en}
          />
        </div>
        <div>
          <Label htmlFor="body_es">{t("fields.bodyEs")}</Label>
          <Textarea
            id="body_es"
            name="body_es"
            className="mt-2 font-mono text-sm"
            rows={14}
            defaultValue={post?.body.es}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="published"
          defaultChecked={post?.published ?? false}
        />
        {t("fields.publish")}
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" className="paint-gradient border-0 text-white">
          {t("save")}
        </Button>
        {status ? (
          <p className="text-sm text-muted-foreground" role="status">
            {status}
          </p>
        ) : null}
      </div>
    </form>
  );
}

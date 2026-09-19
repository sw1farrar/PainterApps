import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { formatNewsDate, localizePost } from "@/lib/news/localize";
import type { NewsPost } from "@/lib/news/types";

export async function NewsCard({ post }: { post: NewsPost }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("news");
  const item = localizePost(post, locale);

  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
        {t(`categories.${post.category}`)}
      </p>
      <h3 className="mt-2 text-lg font-medium tracking-tight">
        <Link href={`/news/${post.slug}`} className="hover:underline">
          {item.title}
        </Link>
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatNewsDate(post.publishedAt, locale)}
      </p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {item.excerpt}
      </p>
      <Link
        href={`/news/${post.slug}`}
        className="mt-4 text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        {t("read")}
      </Link>
    </article>
  );
}

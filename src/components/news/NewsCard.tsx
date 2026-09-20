import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { deleteNewsPost } from "@/app/app/news/actions";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { formatNewsDate, localizePost } from "@/lib/news/localize";
import type { NewsPost } from "@/lib/news/types";

export async function NewsCard({
  post,
  editor = false,
}: {
  post: NewsPost;
  editor?: boolean;
}) {
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
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/news/${post.slug}`}
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("read")}
        </Link>
        {editor ? (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/app/news?edit=${post.id}`}>{t("edit")}</Link>
            </Button>
            {post.origin === "db" ? (
              <form
                action={async () => {
                  "use server";
                  await deleteNewsPost(post.id, post.slug);
                }}
              >
                <Button type="submit" size="sm" variant="ghost">
                  {t("delete")}
                </Button>
              </form>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArticleBody } from "@/components/news/ArticleBody";
import { NewsCard } from "@/components/news/NewsCard";
import type { Locale } from "@/i18n/config";
import { getNewsBySlug, listNews } from "@/lib/news/load";
import { formatNewsDate, localizePost } from "@/lib/news/localize";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);
  if (!post) return { title: "News" };
  const locale = (await getLocale()) as Locale;
  const item = localizePost(post, locale);
  return {
    title: item.title,
    description: item.excerpt,
    openGraph: {
      title: item.title,
      description: item.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);
  if (!post) notFound();

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("news");
  const item = localizePost(post, locale);
  const more = (await listNews())
    .filter((p) => p.slug !== post.slug)
    .slice(0, 2);

  return (
    <article className="mx-auto w-full min-w-0 max-w-2xl px-4 py-12">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        {t(`categories.${post.category}`)}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        {item.title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {formatNewsDate(post.publishedAt, locale)}
      </p>
      <div className="mt-10">
        <ArticleBody markdown={item.body} />
      </div>
      {item.sourceUrl ? (
        <p className="mt-8 text-sm">
          <a
            href={item.sourceUrl}
            className="underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            {t("source")}
          </a>
        </p>
      ) : null}
      <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
        {t("disclaimer")}
      </p>
      <p className="mt-6 text-sm">
        <Link href="/news" className="underline underline-offset-4">
          {t("all")}
        </Link>
      </p>
      {more.length ? (
        <section className="mt-16">
          <h2 className="text-lg font-medium">{t("more")}</h2>
          <div className="mt-4 grid gap-4">
            {more.map((p) => (
              <NewsCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

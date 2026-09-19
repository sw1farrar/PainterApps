import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listNews } from "@/lib/news/load";
import { NewsCard } from "./NewsCard";

export async function NewsTeaser() {
  const t = await getTranslations();
  const posts = (await listNews()).slice(0, 3);
  if (!posts.length) return null;

  return (
    <section className="border-y border-border bg-card/40 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
              {t("news.kicker")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              {t("landing.newsTitle")}
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              {t("landing.newsBody")}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/news">
              {t("news.all")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {posts.map((post) => (
            <NewsCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}

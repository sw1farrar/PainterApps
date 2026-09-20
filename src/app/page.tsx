import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsCard } from "@/components/news/NewsCard";
import { HomeMapBoard } from "@/components/paintday/HomeMapBoard";
import { getMapBoard } from "@/lib/paintday/map-scores";
import { listNews } from "@/lib/news/load";

export default async function HomePage() {
  const t = await getTranslations();
  const [board, posts] = await Promise.all([getMapBoard(), listNews()]);
  const headlines = posts.slice(0, 3);

  return (
    <div>
      <section className="border-b border-border bg-card/40 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {t("landing.mapTitle")}
          </h1>
          <div className="mt-6">
            <HomeMapBoard board={board} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
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
          {headlines.map((post) => (
            <NewsCard key={post.slug} post={post} />
          ))}
        </div>
      </section>

      <section className="border-t border-border py-10">
        <div className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-3">
          <ToolLink
            href="/systems"
            kicker={t("nav.systems")}
            title={t("landing.systemsTitle")}
            body={t("landing.systemsPeek")}
          />
          <ToolLink
            href="/calc"
            kicker={t("nav.calc")}
            title={t("landing.calcTitle")}
            body={t("landing.calcPeek")}
          />
          <ToolLink
            href="/about"
            kicker={t("nav.about")}
            title={t("landing.aboutPeekTitle")}
            body={t("landing.aboutPeek")}
          />
        </div>
      </section>
    </div>
  );
}

function ToolLink({
  href,
  kicker,
  title,
  body,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
    >
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {kicker}
      </p>
      <p className="mt-2 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}

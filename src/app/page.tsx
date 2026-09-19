import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { ZipSearch } from "@/components/paintday/ZipSearch";
import { Button } from "@/components/ui/button";
import { NewsCard } from "@/components/news/NewsCard";
import { PaintDayMap } from "@/components/paintday/PaintDayMap";
import { getMapScores } from "@/lib/paintday/map-scores";
import { listNews } from "@/lib/news/load";
import { scoreColor } from "@/lib/paintday/score";

const FEATURED_ZIPS = ["98101", "80202", "60601", "10001", "33131", "94102"];

export default async function HomePage() {
  const t = await getTranslations();
  const [points, posts] = await Promise.all([getMapScores(), listNews()]);
  const featured = FEATURED_ZIPS.map((zip) =>
    points.find((p) => p.zip === zip),
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const headlines = posts.slice(0, 3);

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 md:pb-12 md:pt-14">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
          {t("landing.kicker")}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("landing.heroBody")}
        </p>
        <div className="mt-7">
          <ZipSearch size="hero" />
          <p className="mt-2 text-sm text-muted-foreground">{t("landing.zipHint")}</p>
        </div>
      </section>

      <section className="border-y border-border bg-card/40 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
                {t("nav.paintday")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                {t("landing.mapTitle")}
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                {t("landing.mapBody")}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/paintday">
                {t("landing.weatherDive")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {featured.length ? (
            <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {featured.map((p) => (
                <li key={p.zip}>
                  <Link
                    href={`/paintday/${p.zip}`}
                    className="block rounded-xl border border-border bg-background px-3 py-2.5 transition hover:border-primary/40"
                  >
                    <p className="truncate text-xs text-muted-foreground">
                      {p.city}
                    </p>
                    <p
                      className="score-numeral text-2xl font-semibold"
                      style={{ color: scoreColor(p.score) }}
                    >
                      {p.score}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6">
            <PaintDayMap points={points} />
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

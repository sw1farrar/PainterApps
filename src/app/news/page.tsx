import { getTranslations } from "next-intl/server";
import { EmptyBoxIllustration } from "@/components/illustrations";
import { NewsCard } from "@/components/news/NewsCard";
import { listNews } from "@/lib/news/load";

export const metadata = {
  title: "News",
  description:
    "Coatings news for professional painters — weather, specs, regulation, and field notes. Independent of any manufacturer.",
};

export default async function NewsPage() {
  const t = await getTranslations("news");
  const posts = await listNews();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
        {t("kicker")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t("subtitle")}</p>

      {posts.length === 0 ? (
        <div className="mt-16 text-center">
          <EmptyBoxIllustration />
          <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <NewsCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

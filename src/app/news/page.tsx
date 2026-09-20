import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyBoxIllustration } from "@/components/illustrations";
import { NewsCard } from "@/components/news/NewsCard";
import { Button } from "@/components/ui/button";
import { currentUserId } from "@/lib/auth/current-user";
import { isNewsEditor } from "@/lib/news/editors";
import { listNews } from "@/lib/news/load";

export const metadata = {
  title: "News",
  description:
    "Coatings news for professional painters — weather, specs, regulation, and field notes. Independent of any manufacturer.",
};

export default async function NewsPage() {
  const t = await getTranslations("news");
  const posts = await listNews();
  const editor = await isNewsEditor(await currentUserId());

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
        {t("kicker")}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        </div>
        {editor ? (
          <Button asChild>
            <Link href="/app/news">{t("newPost")}</Link>
          </Button>
        ) : null}
      </div>

      {posts.length === 0 ? (
        <div className="mt-16 text-center">
          <EmptyBoxIllustration />
          <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <NewsCard key={post.slug} post={post} editor={editor} />
          ))}
        </div>
      )}
    </div>
  );
}

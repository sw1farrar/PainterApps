import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { NewsComposer } from "@/components/news/NewsComposer";
import { Button } from "@/components/ui/button";
import { currentUserId } from "@/lib/auth/current-user";
import { editorIdsFromEnv, isNewsEditor } from "@/lib/news/editors";
import { getNewsById, listNews } from "@/lib/news/load";
import { createClient, supabaseAdmin } from "@/lib/supabase/server";
import { deleteNewsPost } from "./actions";

export const metadata = { title: "News editor" };

export default async function NewsEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const t = await getTranslations("news");
  const userId = await currentUserId();
  const editor = await isNewsEditor(userId);
  const dbReady = Boolean(supabaseAdmin() ?? (await createClient()));
  const posts = await listNews({ includeDrafts: true });
  const editing = edit ? ((await getNewsById(edit)) ?? undefined) : undefined;

  if (!editor) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("editorTitle")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("editorForbidden")}
        </p>
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 font-mono text-xs text-muted-foreground">
          NEWS_EDITOR_USER_IDS={userId ?? "your-user-id"}
        </p>
        <p className="text-sm text-muted-foreground">{t("fileFallback")}</p>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("editorTitle")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("editorNeedsDb")}
        </p>
        <p className="text-sm text-muted-foreground">{t("fileFallback")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("editorTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("editorHelp")}</p>
        {editorIdsFromEnv().length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Editor via profiles.is_editor
          </p>
        ) : null}
      </div>

      <NewsComposer post={editing} />

      <section>
        <h2 className="text-lg font-medium">{t("editorList")}</h2>
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{post.title.en}</p>
                <p className="text-xs text-muted-foreground">
                  /{post.slug} · {post.origin} ·{" "}
                  {post.published ? t("published") : t("draft")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/app/news?edit=${post.id}`}>{t("edit")}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/news/${post.slug}`}>{t("view")}</Link>
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
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

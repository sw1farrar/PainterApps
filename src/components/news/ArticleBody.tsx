import { renderMarkdown } from "@/lib/news/markdown";

export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div
      className="news-body max-w-none space-y-4 text-base leading-relaxed text-foreground/90 [&_a]:underline [&_a]:underline-offset-4 [&_em]:italic [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
    />
  );
}

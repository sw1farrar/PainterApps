import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";
import { mergeNews } from "./load";
import { slugify } from "./slug";
import type { NewsPost } from "./types";

describe("slugify", () => {
  it("builds a URL-safe slug", () => {
    expect(slugify("Always check the TDS revision date")).toBe(
      "always-check-the-tds-revision-date",
    );
  });
});

describe("renderMarkdown", () => {
  it("escapes HTML then applies links and bold", () => {
    const html = renderMarkdown(
      "See **TDS** at [EPA](https://www.epa.gov).\n\n<script>x</script>",
    );
    expect(html).toContain("<strong>TDS</strong>");
    expect(html).toContain('href="https://www.epa.gov"');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

describe("mergeNews", () => {
  const seed: NewsPost[] = [
    {
      id: "s1",
      slug: "alpha",
      category: "field",
      published: true,
      publishedAt: "2026-01-01T00:00:00.000Z",
      title: { en: "Seed", es: "Semilla" },
      excerpt: { en: "e", es: "e" },
      body: { en: "b", es: "b" },
      origin: "seed",
    },
  ];

  it("lets a database post replace the same slug", () => {
    const live: NewsPost[] = [
      {
        ...seed[0],
        id: "db1",
        title: { en: "Live", es: "En vivo" },
        origin: "db",
        publishedAt: "2026-02-01T00:00:00.000Z",
      },
    ];
    const merged = mergeNews(seed, live);
    expect(merged).toHaveLength(1);
    expect(merged[0].title.en).toBe("Live");
    expect(merged[0].origin).toBe("db");
  });
});

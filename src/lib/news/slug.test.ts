import { describe, expect, it } from "vitest";
import { SEED_NEWS } from "@/data/news/posts";
import { renderMarkdown } from "./markdown";
import { mergeNews } from "./load";
import { slugify } from "./slug";
import type { NewsPost } from "./types";

describe("slugify", () => {
  it("builds a URL-safe slug", () => {
    expect(slugify("Builder confidence falls to 32")).toBe(
      "builder-confidence-falls-to-32",
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

describe("SEED_NEWS", () => {
  it("does not ship the original filler posts", () => {
    expect(SEED_NEWS).toEqual([]);
    expect(SEED_NEWS.map((p) => p.slug)).not.toEqual(
      expect.arrayContaining([
        "always-check-the-tds-revision-date",
        "humidity-is-the-crew-day-you-did-not-plan",
        "pre-1978-still-means-lead-safe",
      ]),
    );
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

  it("returns only database posts when file seed is empty", () => {
    const live: NewsPost[] = [
      {
        id: "db-hindupur",
        slug: "hindupur-berger-solvent-plant-2026-09-10",
        category: "industry",
        published: true,
        publishedAt: "2026-09-21T14:15:47.395Z",
        title: {
          en: "Hindupur — Berger starts 36,000 KL solvent paint plant",
          es: "Hindupur",
        },
        excerpt: { en: "e", es: "e" },
        body: { en: "b", es: "b" },
        origin: "db",
      },
      {
        id: "db-dahej",
        slug: "dahej-asian-paints-vae-2026-09-20",
        category: "industry",
        published: true,
        publishedAt: "2026-09-21T14:15:46.070Z",
        title: {
          en: "Dahej — Asian Paints starts 150,000-ton VAE production",
          es: "Dahej",
        },
        excerpt: { en: "e", es: "e" },
        body: { en: "b", es: "b" },
        origin: "db",
      },
    ];
    const merged = mergeNews(SEED_NEWS, live);
    expect(merged.map((p) => p.slug)).toEqual([
      "hindupur-berger-solvent-plant-2026-09-10",
      "dahej-asian-paints-vae-2026-09-20",
    ]);
    expect(
      merged.some((p) => p.slug.includes("tds") || p.slug.includes("humidity") || p.slug.includes("lead")),
    ).toBe(false);
  });
});

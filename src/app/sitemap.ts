import type { MetadataRoute } from "next";
import { SEED_NEWS } from "@/data/news/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://painterapps.com";
  const paths = [
    "",
    "/systems",
    "/calc",
    "/news",
    "/about",
    "/privacy",
    "/terms",
  ];
  const staticRoutes = paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const newsRoutes = SEED_NEWS.filter((p) => p.published).map((p) => ({
    url: `${base}/news/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...staticRoutes, ...newsRoutes];
}

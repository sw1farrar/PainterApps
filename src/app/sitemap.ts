import type { MetadataRoute } from "next";
import { listNews } from "@/lib/news/load";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
  const newsRoutes = (await listNews()).map((p) => ({
    url: `${base}/news/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...staticRoutes, ...newsRoutes];
}

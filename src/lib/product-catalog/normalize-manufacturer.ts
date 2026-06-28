import type { PaintManufacturerRow } from "@/lib/product-catalog/types";

export function normalizeManufacturerRow(
  row: Record<string, unknown>,
): PaintManufacturerRow {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    website_url: typeof row.website_url === "string" ? row.website_url : null,
    official_domains: Array.isArray(row.official_domains)
      ? row.official_domains.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [],
    aliases: Array.isArray(row.aliases)
      ? row.aliases.filter((entry): entry is string => typeof entry === "string")
      : [],
    logo_url: typeof row.logo_url === "string" ? row.logo_url : null,
    logo_storage_path:
      typeof row.logo_storage_path === "string" ? row.logo_storage_path : null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
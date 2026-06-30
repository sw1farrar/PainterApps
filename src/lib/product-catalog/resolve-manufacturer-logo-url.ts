import { scoreManufacturerSimilarity } from "@/lib/product-catalog/find-platform-product-matches";
import {
  resolveManufacturerLogoPublicUrl,
  type ManufacturerLogoFields,
} from "@/lib/product-catalog/manufacturer-logo-public-url";
import { normalizeManufacturerRow } from "@/lib/product-catalog/normalize-manufacturer";
import type { PaintManufacturerRow } from "@/lib/product-catalog/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type { ManufacturerLogoFields };
export { resolveManufacturerLogoPublicUrl };

const MANUFACTURER_MATCH_THRESHOLD = 0.55;

export async function findPaintManufacturerByName(
  manufacturerName: string,
): Promise<PaintManufacturerRow | null> {
  const query = manufacturerName.trim();
  if (!query) return null;

  const admin = createAdminClient();
  const { data: manufacturers, error } = await admin
    .from("paint_manufacturers")
    .select("*");

  if (error || !manufacturers?.length) return null;

  let best: { row: Record<string, unknown>; score: number } | null = null;

  for (const row of manufacturers) {
    const score = scoreManufacturerSimilarity(query, {
      name: String(row.name),
      aliases: Array.isArray(row.aliases)
        ? row.aliases.filter((entry): entry is string => typeof entry === "string")
        : [],
      slug: typeof row.slug === "string" ? row.slug : null,
    });

    if (
      score >= MANUFACTURER_MATCH_THRESHOLD &&
      (!best || score > best.score)
    ) {
      best = { row, score };
    }
  }

  return best ? normalizeManufacturerRow(best.row) : null;
}

export async function resolveCanonicalManufacturerName(
  manufacturerName: string,
): Promise<{ canonicalName: string; wasMatched: boolean }> {
  const query = manufacturerName.trim();
  if (!query) return { canonicalName: "", wasMatched: false };

  const match = await findPaintManufacturerByName(query);
  if (!match) return { canonicalName: query, wasMatched: false };

  return {
    canonicalName: match.name,
    wasMatched: match.name !== query,
  };
}

export async function resolveManufacturerLogoUrlForName(
  manufacturerName: string,
): Promise<string | null> {
  const manufacturer = await findPaintManufacturerByName(manufacturerName);
  if (!manufacturer) return null;

  return resolveManufacturerLogoPublicUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    manufacturer,
  );
}
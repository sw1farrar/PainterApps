import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePlatformCanImageUrl } from "@/lib/product-catalog/resolve-can-image-url";

export type PlatformProductMatch = {
  id: string;
  name: string;
  manufacturerName: string;
  applicationType: string;
  category: string;
  matchScore: number;
  canImageUrl: string | null;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 2),
  );
}

export function scoreProductNameSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return 0.92;
  }

  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (!leftTokens.size || !rightTokens.size) return 0;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

export function scoreManufacturerSimilarity(
  query: string,
  manufacturer: {
    name: string;
    aliases?: string[] | null;
    slug?: string | null;
  },
): number {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const candidates = [
    manufacturer.name,
    manufacturer.slug ?? "",
    ...(manufacturer.aliases ?? []),
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  let best = 0;
  for (const candidate of candidates) {
    if (candidate === normalizedQuery) best = Math.max(best, 1);
    else if (
      candidate.includes(normalizedQuery) ||
      normalizedQuery.includes(candidate)
    ) {
      best = Math.max(best, 0.9);
    } else {
      const queryTokens = tokenSet(normalizedQuery);
      const candidateTokens = tokenSet(candidate);
      let overlap = 0;
      for (const token of queryTokens) {
        if (candidateTokens.has(token)) overlap += 1;
      }
      if (queryTokens.size) {
        best = Math.max(best, overlap / queryTokens.size);
      }
    }
  }

  return best;
}

const STRONG_MATCH_THRESHOLD = 0.72;

export async function findPlatformProductMatches(input: {
  manufacturerName: string;
  productName: string;
  limit?: number;
}): Promise<PlatformProductMatch[]> {
  const manufacturerName = input.manufacturerName.trim();
  const productName = input.productName.trim();
  if (!manufacturerName || !productName) return [];

  const admin = createAdminClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;

  const { data: manufacturers, error: manufacturerError } = await admin
    .from("paint_manufacturers")
    .select("id, name, slug, aliases");

  if (manufacturerError || !manufacturers?.length) return [];

  const manufacturerScores = manufacturers
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
      score: scoreManufacturerSimilarity(manufacturerName, {
        name: String(row.name),
        aliases: Array.isArray(row.aliases)
          ? row.aliases.filter((entry): entry is string => typeof entry === "string")
          : [],
        slug: typeof row.slug === "string" ? row.slug : null,
      }),
    }))
    .filter((row) => row.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!manufacturerScores.length) return [];

  const manufacturerIds = manufacturerScores.map((row) => row.id);
  const { data: products, error: productError } = await admin
    .from("paint_products")
    .select(
      "id, name, application_type, category, can_image_url, can_image_storage_path, manufacturer_id",
    )
    .in("manufacturer_id", manufacturerIds)
    .eq("is_discontinued", false)
    .ilike("name", `%${productName.replace(/[%_]/g, "")}%`)
    .limit(40);

  if (productError || !products?.length) return [];

  const manufacturerById = new Map(
    manufacturerScores.map((row) => [row.id, row]),
  );

  const matches = products
    .map((row) => {
      const manufacturer = manufacturerById.get(String(row.manufacturer_id));
      if (!manufacturer) return null;

      const nameScore = scoreProductNameSimilarity(productName, String(row.name));
      const matchScore = nameScore * 0.75 + manufacturer.score * 0.25;

      return {
        id: String(row.id),
        name: String(row.name),
        manufacturerName: manufacturer.name,
        applicationType: String(row.application_type),
        category: String(row.category),
        matchScore,
        canImageUrl: resolvePlatformCanImageUrl(supabaseUrl, row),
      } satisfies PlatformProductMatch;
    })
    .filter((row): row is PlatformProductMatch => row !== null)
    .filter((row) => row.matchScore >= STRONG_MATCH_THRESHOLD)
    .sort((a, b) => b.matchScore - a.matchScore);

  return matches.slice(0, input.limit ?? 3);
}
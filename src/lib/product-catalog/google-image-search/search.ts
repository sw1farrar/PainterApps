import {
  getGoogleCustomSearchApiKey,
  getGoogleCustomSearchEngineId,
  getGoogleImageSearchConfigError,
} from "@/lib/product-catalog/google-image-search/env";

export type GoogleImageSearchResult = {
  imageUrl: string;
  sourceUrl: string | null;
  title: string | null;
  width: number | null;
  height: number | null;
};

type GoogleCustomSearchResponse = {
  items?: Array<{
    link?: string;
    title?: string;
    image?: {
      contextLink?: string;
      thumbnailLink?: string;
      width?: number;
      height?: number;
    };
  }>;
  error?: {
    message?: string;
  };
};

const BLOCKED_IMAGE_HOST_SUFFIXES = [
  "gstatic.com",
  "googleusercontent.com",
  "ggpht.com",
  "pinimg.com",
  "pinterest.com",
  "facebook.com",
  "fbcdn.net",
  "instagram.com",
  "ytimg.com",
  "wikimedia.org",
  "wikipedia.org",
];

function isBlockedImageHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return BLOCKED_IMAGE_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return true;
  }
}

function isLikelyRasterImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return false;
  if (/\.(svg|ico)(\?|$)/i.test(lower)) return false;
  return true;
}

export async function searchGoogleImages(
  query: string,
  options?: { num?: number; start?: number },
): Promise<
  | { success: true; results: GoogleImageSearchResult[] }
  | { success: false; error: string }
> {
  const configError = getGoogleImageSearchConfigError();
  if (configError) {
    return { success: false, error: configError };
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { success: false, error: "Enter a search query." };
  }

  const apiKey = getGoogleCustomSearchApiKey()!;
  const engineId = getGoogleCustomSearchEngineId()!;
  const num = Math.min(Math.max(options?.num ?? 10, 1), 10);

  const params = new URLSearchParams({
    key: apiKey,
    cx: engineId,
    q: trimmedQuery,
    searchType: "image",
    num: String(num),
    safe: "active",
  });

  if (options?.start && options.start > 1) {
    params.set("start", String(options.start));
  }

  let response: Response;
  try {
    response = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
      { cache: "no-store" },
    );
  } catch {
    return {
      success: false,
      error: "Could not reach image search. Check your network and try again.",
    };
  }

  let payload: GoogleCustomSearchResponse;
  try {
    payload = (await response.json()) as GoogleCustomSearchResponse;
  } catch {
    return {
      success: false,
      error: `Image search returned an invalid response (HTTP ${response.status}).`,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error:
        payload.error?.message ??
        `Image search failed with status ${response.status}.`,
    };
  }

  const seen = new Set<string>();
  const results: GoogleImageSearchResult[] = [];

  for (const item of payload.items ?? []) {
    const imageUrl = item.link?.trim();
    if (!imageUrl || seen.has(imageUrl)) continue;
    if (!isLikelyRasterImageUrl(imageUrl) || isBlockedImageHost(imageUrl)) {
      continue;
    }

    seen.add(imageUrl);
    results.push({
      imageUrl,
      sourceUrl: item.image?.contextLink?.trim() || null,
      title: item.title?.trim() || null,
      width: item.image?.width ?? null,
      height: item.image?.height ?? null,
    });
  }

  return { success: true, results };
}
import { createXaiResponse } from "@/lib/xai/responses";
import { getXaiEnvError } from "@/lib/xai/env";
import { isRejectableGenericImageUrl } from "@/lib/sell-sheet/paint-can-trust";

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();

  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function isLikelyImageUrl(value: string): boolean {
  if (isRejectableGenericImageUrl(value)) return false;

  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return false;

    const target = `${url.pathname}${url.search}`.toLowerCase();
    if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(target)) return true;
    if (/(?:image|media|asset|pack|product|photo|picture|thumbnail)=/i.test(target)) {
      return true;
    }
    if (/\/(?:images?|media|assets|product|packshots?)\//i.test(url.pathname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function collectImageUrls(text: string, citations: string[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || !isLikelyImageUrl(trimmed) || seen.has(trimmed)) return;
    seen.add(trimmed);
    urls.push(trimmed);
  };

  const json = extractJsonObject(text);
  const rawList =
    json?.imageUrls ??
    json?.image_urls ??
    json?.images ??
    json?.candidates;

  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (typeof item === "string") {
        push(item);
        continue;
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        push(
          typeof record.imageUrl === "string"
            ? record.imageUrl
            : typeof record.image_url === "string"
              ? record.image_url
              : typeof record.url === "string"
                ? record.url
                : typeof record.link === "string"
                  ? record.link
                  : null,
        );
      }
    }
  }

  for (const match of text.matchAll(/!\[[^\]]*]\((https?:\/\/[^\s)]+)\)/gi)) {
    push(match[1]);
  }

  for (const match of text.matchAll(
    /(https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif)(?:\?[^\s"'<>]*)?)/gi,
  )) {
    push(match[1]);
  }

  for (const citation of citations) {
    push(citation);
  }

  return urls;
}

export async function searchPaintCanImageUrlsWithXai(input: {
  query: string;
  manufacturerName: string;
  productName: string;
}): Promise<
  | { success: true; imageUrls: string[] }
  | { success: false; error: string }
> {
  const configError = getXaiEnvError();
  if (configError) {
    return { success: false, error: configError };
  }

  const response = await createXaiResponse({
    instructions: [
      "You search the web for labeled paint can product photos.",
      "Return ONLY valid JSON with this shape: { imageUrls: string[] }.",
      "Each URL must be a direct image link (jpg, png, or webp).",
      "Prefer gallon or quart paint cans with readable product labels.",
      "Do not return page URLs, retailer homepages, or brochure PDFs.",
    ].join(" "),
    prompt: [
      `Image search query: ${input.query}`,
      `Manufacturer: ${input.manufacturerName}`,
      `Product: ${input.productName}`,
      "Return up to 10 direct paint can image URLs from image search results.",
    ].join("\n"),
    webSearch: {
      enableImageSearch: true,
      enableImageUnderstanding: true,
    },
  });

  if (!response.success) {
    return { success: false, error: response.error };
  }

  const imageUrls = collectImageUrls(response.text, response.citations);
  if (!imageUrls.length) {
    return {
      success: false,
      error:
        "Could not find paint can images online. Try a more specific product name or paste a can image URL manually.",
    };
  }

  return { success: true, imageUrls };
}
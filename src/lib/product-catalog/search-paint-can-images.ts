import { meetsMinimumCanImageQuality } from "@/lib/product-catalog/can-image-quality";
export type CustomProductCanCandidate = {
  id: string;
  previewDataUrl: string;
  remoteImageUrl: string;
  sourceUrl: string | null;
};
import {
  getGoogleImageSearchConfigError,
} from "@/lib/product-catalog/google-image-search/env";
import { searchGoogleImages } from "@/lib/product-catalog/google-image-search/search";
import { searchPaintCanImageUrlsWithXai } from "@/lib/product-catalog/search-paint-can-images-xai";
import type { PaintProductApplication } from "@/lib/product-catalog/types";
import { getXaiEnvError } from "@/lib/xai/env";
import { downloadPaintCanImageCandidate } from "@/lib/sell-sheet/paint-can-image";

const MAX_CAN_CANDIDATES = 8;

export type PaintCanImageUrlHit = {
  imageUrl: string;
  sourceUrl: string | null;
  title: string | null;
  width: number | null;
  height: number | null;
};

export function buildPaintCanImageSearchQuery(input: {
  manufacturerName: string;
  productName: string;
  applicationType?: PaintProductApplication;
}): string {
  const parts = [
    input.manufacturerName.trim(),
    input.productName.trim(),
    "paint can",
  ];

  if (input.applicationType && input.applicationType !== "both") {
    parts.push(input.applicationType);
  }

  return parts.filter(Boolean).join(" ");
}

function scoreImageResult(input: {
  width: number | null;
  height: number | null;
  title: string | null;
  manufacturerName: string;
  productName: string;
}): number {
  let score = 0;

  if (input.width && input.height) {
    score += Math.min(input.width * input.height, 500_000) / 10_000;
  }

  const corpus = `${input.title ?? ""}`.toLowerCase();
  const manufacturer = input.manufacturerName.toLowerCase();
  const product = input.productName.toLowerCase();

  if (corpus.includes("paint can") || corpus.includes("paintcan")) score += 4;
  if (corpus.includes(manufacturer)) score += 3;
  if (corpus.includes(product)) score += 3;
  if (corpus.includes("gallon") || corpus.includes("quart")) score += 1;

  return score;
}

async function buildCandidatesFromImageUrls(
  imageUrls: string[],
  input: {
    manufacturerName: string;
    productName: string;
    titlesByUrl?: Map<string, string | null>;
    widthsByUrl?: Map<string, number | null>;
    heightsByUrl?: Map<string, number | null>;
    sourceUrlsByUrl?: Map<string, string | null>;
  },
): Promise<CustomProductCanCandidate[]> {
  const ranked = [...imageUrls].sort((left, right) => {
    const leftScore = scoreImageResult({
      width: input.widthsByUrl?.get(left) ?? null,
      height: input.heightsByUrl?.get(left) ?? null,
      title: input.titlesByUrl?.get(left) ?? null,
      manufacturerName: input.manufacturerName,
      productName: input.productName,
    });
    const rightScore = scoreImageResult({
      width: input.widthsByUrl?.get(right) ?? null,
      height: input.heightsByUrl?.get(right) ?? null,
      title: input.titlesByUrl?.get(right) ?? null,
      manufacturerName: input.manufacturerName,
      productName: input.productName,
    });
    return rightScore - leftScore;
  });

  const candidates: CustomProductCanCandidate[] = [];

  for (const [index, imageUrl] of ranked.entries()) {
    if (candidates.length >= MAX_CAN_CANDIDATES) break;

    const downloaded = await downloadPaintCanImageCandidate(imageUrl);
    if (!downloaded.success) continue;

    const qualityOk = meetsMinimumCanImageQuality({
      imageUrl: downloaded.imageUrl,
      buffer: downloaded.buffer,
      mime: downloaded.mime,
      manualSelection: true,
    });

    if (!qualityOk) continue;

    candidates.push({
      id: `image-${index}`,
      previewDataUrl: downloaded.dataUrl,
      remoteImageUrl: downloaded.imageUrl,
      sourceUrl: input.sourceUrlsByUrl?.get(imageUrl) ?? null,
    });
  }

  return candidates;
}

function imageSearchUnavailableMessage(): string {
  const googleError = getGoogleImageSearchConfigError();
  const xaiError = getXaiEnvError();

  if (googleError && xaiError) {
    return `${googleError} Alternatively, ${xaiError.charAt(0).toLowerCase()}${xaiError.slice(1)}`;
  }

  return (
    googleError ??
    xaiError ??
    "Image search is not configured."
  );
}

export async function resolvePaintCanImageUrls(input: {
  manufacturerName: string;
  productName: string;
  applicationType?: PaintProductApplication;
}): Promise<
  | { success: true; query: string; hits: PaintCanImageUrlHit[] }
  | { success: false; error: string; query: string }
> {
  const manufacturerName = input.manufacturerName.trim();
  const productName = input.productName.trim();
  const query = buildPaintCanImageSearchQuery({
    manufacturerName,
    productName,
    applicationType: input.applicationType,
  });

  if (!manufacturerName || !productName) {
    return {
      success: false,
      error: "Enter the manufacturer and product name before searching images.",
      query,
    };
  }

  const hits: PaintCanImageUrlHit[] = [];
  let lastError = imageSearchUnavailableMessage();

  if (!getGoogleImageSearchConfigError()) {
    const search = await searchGoogleImages(query, { num: 10 });
    if (search.success) {
      for (const result of search.results) {
        hits.push({
          imageUrl: result.imageUrl,
          sourceUrl: result.sourceUrl,
          title: result.title,
          width: result.width,
          height: result.height,
        });
      }
    } else {
      lastError = search.error;
    }
  }

  if (!hits.length && !getXaiEnvError()) {
    const xaiSearch = await searchPaintCanImageUrlsWithXai({
      query,
      manufacturerName,
      productName,
    });

    if (xaiSearch.success) {
      for (const imageUrl of xaiSearch.imageUrls) {
        hits.push({
          imageUrl,
          sourceUrl: null,
          title: null,
          width: null,
          height: null,
        });
      }
      lastError = "";
    } else {
      lastError = xaiSearch.error;
    }
  }

  if (!hits.length) {
    return { success: false, error: lastError, query };
  }

  return { success: true, query, hits };
}

export async function downloadPaintCanImageCandidates(input: {
  manufacturerName: string;
  productName: string;
  hits: PaintCanImageUrlHit[];
}): Promise<
  | { success: true; candidates: CustomProductCanCandidate[] }
  | { success: false; error: string }
> {
  const manufacturerName = input.manufacturerName.trim();
  const productName = input.productName.trim();

  const titlesByUrl = new Map<string, string | null>();
  const widthsByUrl = new Map<string, number | null>();
  const heightsByUrl = new Map<string, number | null>();
  const sourceUrlsByUrl = new Map<string, string | null>();

  for (const hit of input.hits) {
    titlesByUrl.set(hit.imageUrl, hit.title);
    widthsByUrl.set(hit.imageUrl, hit.width);
    heightsByUrl.set(hit.imageUrl, hit.height);
    sourceUrlsByUrl.set(hit.imageUrl, hit.sourceUrl);
  }

  const candidates = await buildCandidatesFromImageUrls(
    input.hits.map((hit) => hit.imageUrl),
    {
      manufacturerName,
      productName,
      titlesByUrl,
      widthsByUrl,
      heightsByUrl,
      sourceUrlsByUrl,
    },
  );

  if (!candidates.length) {
    return {
      success: false,
      error:
        "Found image results, but none could be downloaded. Try a more specific product name or paste a can image URL manually.",
    };
  }

  return { success: true, candidates };
}

export async function searchPaintCanImagesFromGoogle(input: {
  manufacturerName: string;
  productName: string;
  applicationType?: PaintProductApplication;
}): Promise<
  | { success: true; candidates: CustomProductCanCandidate[]; query: string }
  | { success: false; error: string; query: string }
> {
  const resolved = await resolvePaintCanImageUrls(input);
  if (!resolved.success) {
    return {
      success: false,
      error: resolved.error,
      query: resolved.query,
    };
  }

  const downloaded = await downloadPaintCanImageCandidates({
    manufacturerName: input.manufacturerName,
    productName: input.productName,
    hits: resolved.hits,
  });

  if (!downloaded.success) {
    return {
      success: false,
      error: downloaded.error,
      query: resolved.query,
    };
  }

  return {
    success: true,
    candidates: downloaded.candidates,
    query: resolved.query,
  };
}
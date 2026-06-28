import { meetsMinimumCanImageQuality } from "@/lib/product-catalog/can-image-quality";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildManufacturerPromoImageCandidates,
  isBrochureLikeImageUrl,
  isKnownPaintCanPackshotUrl,
  isRejectableGenericImageUrl,
  isSherwinPromoPackshotUrl,
  scorePaintCanImageCandidate,
} from "@/lib/sell-sheet/paint-can-trust";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_LOGO_BYTES,
  STORAGE_BUCKETS,
} from "@/lib/storage/constants";
import type { SellSheetTierKey } from "@/types/sell-sheet";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SHERWIN_REFERER = "https://www.sherwin-williams.com/";

const PAGE_FETCH_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "User-Agent": BROWSER_USER_AGENT,
  "Accept-Language": "en-US,en;q=0.9",
};

function hostNeedsSherwinReferer(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host.includes("sherwin-williams.com") || host.includes("scene7.com");
}

function imageFetchHeaders(imageUrl: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "User-Agent": BROWSER_USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    if (hostNeedsSherwinReferer(new URL(imageUrl).hostname)) {
      headers.Referer = SHERWIN_REFERER;
    }
  } catch {
    // ignore invalid URLs
  }

  return headers;
}

function pageFetchHeaders(pageUrl: string): Record<string, string> {
  const headers: Record<string, string> = { ...PAGE_FETCH_HEADERS };
  try {
    if (hostNeedsSherwinReferer(new URL(pageUrl).hostname)) {
      headers.Referer = SHERWIN_REFERER;
    }
  } catch {
    // ignore invalid URLs
  }
  return headers;
}

const IMAGE_FETCH_TIMEOUT_MS = 12_000;
const PAGE_FETCH_TIMEOUT_MS = 15_000;

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const GENERIC_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
  "application/download",
  "application/unknown",
]);

const HTML_MIME_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "text/plain",
]);

export type PaintCanImageCandidateContext = {
  paintType?: string;
  manufacturer?: string;
  sourceUrl?: string | null;
};

type DownloadedImage = {
  buffer: Buffer;
  mime: string;
  dataUrl: string;
};

export type ImageDimensions = {
  width: number;
  height: number;
};

function extensionForMime(mime: string): string {
  return IMAGE_EXTENSIONS[mime.toLowerCase()] ?? "jpg";
}

function isAllowedImageMime(mime: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(
    mime.toLowerCase(),
  );
}

function bufferToDataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function getPublicUrl(path: string): string {
  const admin = createAdminClient();
  const { data } = admin.storage
    .from(STORAGE_BUCKETS.sellSheetAssets)
    .getPublicUrl(path);
  return data.publicUrl;
}

function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }

  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

function mimeFromUrlPath(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith(".png")) return "image/png";
    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
      return "image/jpeg";
    }
    if (pathname.endsWith(".webp")) return "image/webp";
    if (pathname.endsWith(".gif")) return "image/gif";
  } catch {
    return null;
  }

  return null;
}

function normalizeDeclaredMime(
  declaredMime: string,
  buffer: Buffer,
  url: string,
): string {
  const headerMime = declaredMime.split(";")[0].trim().toLowerCase();
  const sniffed = sniffImageMime(buffer);
  if (sniffed) return sniffed;

  if (!GENERIC_MIME_TYPES.has(headerMime) && headerMime) {
    return headerMime;
  }

  return mimeFromUrlPath(url) ?? headerMime;
}

function looksLikeHtml(buffer: Buffer, mime: string): boolean {
  if (HTML_MIME_TYPES.has(mime)) return true;

  const prefix = buffer.subarray(0, 256).toString("utf8").trimStart().toLowerCase();
  return prefix.startsWith("<!doctype html") || prefix.startsWith("<html");
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

function toAbsoluteUrl(value: string, pageUrl: string): string | null {
  const trimmed = decodeHtmlAttribute(value);
  if (!trimmed || trimmed.startsWith("data:")) return null;

  try {
    return new URL(trimmed, pageUrl).toString();
  } catch {
    return null;
  }
}

function readPngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50) return null;

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      if (width > 0 && height > 0) {
        return { width, height };
      }
      return null;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;
    offset += 2 + segmentLength;
  }

  return null;
}

export function readImageDimensions(
  buffer: Buffer,
  mime: string,
): ImageDimensions | null {
  const normalized = mime.toLowerCase();
  if (normalized.includes("png")) return readPngDimensions(buffer);
  if (normalized.includes("jpeg") || normalized.includes("jpg")) {
    return readJpegDimensions(buffer);
  }

  return readPngDimensions(buffer) ?? readJpegDimensions(buffer);
}

export function isDocumentLikeImageDimensions(
  dimensions: ImageDimensions,
): boolean {
  const { width, height } = dimensions;
  if (width <= 0 || height <= 0) return false;

  const ratio = width / height;
  return ratio >= 1.18;
}

export function isLikelyNonPaintCanImage(
  buffer: Buffer,
  mime: string,
  imageUrl?: string | null,
): boolean {
  if (imageUrl && isBrochureLikeImageUrl(imageUrl)) return true;

  const dimensions = readImageDimensions(buffer, mime);
  if (dimensions && isDocumentLikeImageDimensions(dimensions)) {
    return true;
  }

  return false;
}

function pushCandidate(
  seen: Set<string>,
  candidates: Array<{ url: string; score: number }>,
  rawUrl: string | null | undefined,
  pageUrl: string,
  bonus = 0,
  context?: PaintCanImageCandidateContext & { altText?: string },
) {
  if (!rawUrl) return;
  const absolute = toAbsoluteUrl(rawUrl, pageUrl);
  if (!absolute || seen.has(absolute) || isRejectableGenericImageUrl(absolute)) {
    return;
  }

  seen.add(absolute);
  candidates.push({
    url: absolute,
    score:
      scorePaintCanImageCandidate(absolute, {
        paintType: context?.paintType,
        manufacturer: context?.manufacturer,
        altText: context?.altText,
      }) + bonus,
  });
}

function extractLargestSrcsetUrl(srcset: string, pageUrl: string): string | null {
  const entries = srcset
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  let bestUrl: string | null = null;
  let bestWidth = -1;

  for (const entry of entries) {
    const match = entry.match(/^(\S+)(?:\s+(\d+)(?:w|px))?$/i);
    if (!match?.[1]) continue;

    const absolute = toAbsoluteUrl(match[1], pageUrl);
    if (!absolute) continue;

    const width = match[2] ? Number.parseInt(match[2], 10) : 0;
    if (width >= bestWidth) {
      bestWidth = width;
      bestUrl = absolute;
    }
  }

  return bestUrl;
}

function readHtmlAttribute(tag: string, attribute: string): string | null {
  const pattern = new RegExp(
    `${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    "i",
  );
  const match = tag.match(pattern);
  return match?.[1] ?? match?.[2] ?? null;
}

export function extractImageCandidatesFromHtml(
  html: string,
  pageUrl: string,
  context?: PaintCanImageCandidateContext,
): string[] {
  const seen = new Set<string>();
  const candidates: Array<{ url: string; score: number }> = [];

  const metaPatterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/gi,
  ];

  for (const pattern of metaPatterns) {
    for (const match of html.matchAll(pattern)) {
      pushCandidate(seen, candidates, match[1], pageUrl, 0, context);
    }
  }

  for (const tagMatch of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = tagMatch[0];
    const altText = readHtmlAttribute(tag, "alt");
    const src =
      readHtmlAttribute(tag, "data-src") ??
      readHtmlAttribute(tag, "data-original") ??
      readHtmlAttribute(tag, "src");
    const srcset = readHtmlAttribute(tag, "srcset");
    const imgContext = { ...context, altText: altText ?? undefined };

    if (srcset?.includes(",")) {
      pushCandidate(
        seen,
        candidates,
        extractLargestSrcsetUrl(srcset, pageUrl),
        pageUrl,
        4,
        imgContext,
      );
    } else if (src) {
      pushCandidate(seen, candidates, src, pageUrl, 4, imgContext);
    }
  }

  for (const match of html.matchAll(/<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi)) {
    const value = match[1];
    if (!value) continue;
    pushCandidate(
      seen,
      candidates,
      value.includes(",")
        ? extractLargestSrcsetUrl(value, pageUrl)
        : value,
      pageUrl,
      2,
      context,
    );
  }

  const jsonLdPattern =
    /"image"\s*:\s*("(https?:\/\/[^"]+)"|\[([\s\S]*?)\])/gi;
  for (const match of html.matchAll(jsonLdPattern)) {
    if (match[2]) {
      pushCandidate(seen, candidates, match[2], pageUrl, 3, context);
      continue;
    }

    if (match[3]) {
      for (const urlMatch of match[3].matchAll(/"(https?:\/\/[^"]+)"/g)) {
        pushCandidate(seen, candidates, urlMatch[1], pageUrl, 3, context);
      }
    }
  }

  for (const match of html.matchAll(
    /(?:https?:)?\/\/sherwin\.scene7\.com\/is\/image\/[^"'\s<>]+/gi,
  )) {
    pushCandidate(seen, candidates, match[0], pageUrl, 10, context);
  }

  for (const match of html.matchAll(/_tparam_layer_1_src=sw\/([A-Za-z0-9_]+)/gi)) {
    const asset = match[1];
    if (!asset) continue;
    pushCandidate(
      seen,
      candidates,
      `https://sherwin.scene7.com/is/image/sw/${asset}`,
      pageUrl,
      12,
      context,
    );
  }

  for (const match of html.matchAll(
    /is\/image\/sw\/([A-Za-z0-9_]+(?:Parent|_1G_|Acrylic_Ltx)[A-Za-z0-9_]*)/gi,
  )) {
    pushCandidate(
      seen,
      candidates,
      `https://sherwin.scene7.com/is/image/sw/${match[1]}`,
      pageUrl,
      8,
      context,
    );
  }

  for (const match of html.matchAll(/sw-img-promo-([a-z0-9-]+)/gi)) {
    pushCandidate(
      seen,
      candidates,
      `https://images.sherwin-williams.com/content_images/sw-img-promo-${match[1]}.jpg`,
      pageUrl,
      14,
      context,
    );
  }

  return candidates
    .filter((entry) => entry.score > -50)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.url);
}

export async function resolvePaintCanImageCandidatesFromPage(
  pageUrl: string,
  context?: PaintCanImageCandidateContext,
): Promise<
  | { success: true; imageUrls: string[] }
  | { success: false; error: string }
> {
  let response: Response;
  try {
    response = await fetchWithTimeout(
      pageUrl,
      {
        headers: pageFetchHeaders(pageUrl),
        redirect: "follow",
      },
      PAGE_FETCH_TIMEOUT_MS,
    );
  } catch {
    return {
      success: false,
      error: "Could not open the manufacturer product page.",
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error: `Could not open the manufacturer product page (HTTP ${response.status}).`,
    };
  }

  const html = await response.text();
  const imageUrls = extractImageCandidatesFromHtml(html, pageUrl, context);
  if (imageUrls.length === 0) {
    return {
      success: false,
      error: "No product image was found on the manufacturer page.",
    };
  }

  return { success: true, imageUrls };
}

export async function resolvePaintCanImageFromPage(
  pageUrl: string,
  context?: PaintCanImageCandidateContext,
): Promise<{ success: true; imageUrl: string } | { success: false; error: string }> {
  const resolved = await resolvePaintCanImageCandidatesFromPage(pageUrl, context);
  if (!resolved.success) return resolved;

  return { success: true, imageUrl: resolved.imageUrls[0]! };
}

export async function collectPaintCanImageCandidates(input: {
  imageUrl: string | null;
  sourceUrl: string | null;
  paintType?: string;
  manufacturer?: string;
  applicationType?: "interior" | "exterior" | "";
}): Promise<string[]> {
  const context: PaintCanImageCandidateContext = {
    paintType: input.paintType,
    manufacturer: input.manufacturer,
    sourceUrl: input.sourceUrl,
  };
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (url: string | null | undefined) => {
    if (!url || seen.has(url) || isRejectableGenericImageUrl(url)) return;
    seen.add(url);
    ordered.push(url);
  };

  if (input.manufacturer && input.paintType) {
    for (const promoUrl of buildManufacturerPromoImageCandidates(
      input.manufacturer,
      input.paintType,
      input.applicationType,
    )) {
      push(promoUrl);
    }
  }

  const pageUrls = [input.sourceUrl, input.imageUrl].filter(
    (value): value is string => Boolean(value),
  );

  for (const pageUrl of pageUrls) {
    const resolved = await resolvePaintCanImageCandidatesFromPage(
      pageUrl,
      context,
    );
    if (resolved.success) {
      for (const imageUrl of resolved.imageUrls) {
        push(imageUrl);
      }
    }
  }

  if (input.imageUrl && !isRejectableGenericImageUrl(input.imageUrl)) {
    push(input.imageUrl);
  }

  return ordered.sort((left, right) => {
    const leftScore = scorePaintCanImageCandidate(left, context);
    const rightScore = scorePaintCanImageCandidate(right, context);
    return rightScore - leftScore;
  });
}

function finalizeDownload(
  buffer: Buffer,
  mime: string,
  imageUrl: string,
):
  | { success: true; data: DownloadedImage }
  | { success: false; error: string } {
  if (buffer.byteLength === 0) {
    return { success: false, error: "The paint can image file was empty." };
  }

  if (!isAllowedImageMime(mime)) {
    return {
      success: false,
      error:
        "Could not use the manufacturer image (unsupported format). Try uploading a JPG, PNG, or WebP manually.",
    };
  }

  if (buffer.byteLength > MAX_LOGO_BYTES) {
    return {
      success: false,
      error: "The paint can image is too large. Upload a smaller image manually.",
    };
  }

  if (isLikelyNonPaintCanImage(buffer, mime, imageUrl)) {
    return {
      success: false,
      error:
        "The manufacturer image looks like a brochure or document, not a paint can photo.",
    };
  }

  const trustedPackshot =
    isSherwinPromoPackshotUrl(imageUrl) || isKnownPaintCanPackshotUrl(imageUrl);

  if (
    !meetsMinimumCanImageQuality({
      buffer,
      mime,
      imageUrl,
      trustedPackshot,
    })
  ) {
    return {
      success: false,
      error:
        "The paint can image is too small or low resolution. Try a larger product photo.",
    };
  }

  return {
    success: true,
    data: {
      buffer,
      mime,
      dataUrl: bufferToDataUrl(buffer, mime),
    },
  };
}

export async function downloadPaintCanImage(
  imageUrl: string,
  depth = 0,
): Promise<
  | { success: true; buffer: Buffer; mime: string; dataUrl: string }
  | { success: false; error: string }
> {
  if (depth > 3) {
    return {
      success: false,
      error: "Could not find a usable paint can image on the manufacturer site.",
    };
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      imageUrl,
      {
        headers: imageFetchHeaders(imageUrl),
        redirect: "follow",
      },
      IMAGE_FETCH_TIMEOUT_MS,
    );
  } catch {
    return {
      success: false,
      error: "Could not download the paint can image from the manufacturer site.",
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error: `Could not download the paint can image (HTTP ${response.status}).`,
    };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const finalUrl = response.url || imageUrl;
  const mime = normalizeDeclaredMime(
    response.headers.get("content-type") ?? "",
    buffer,
    finalUrl,
  );

  if (looksLikeHtml(buffer, mime)) {
    const html = buffer.toString("utf8");
    const candidates = extractImageCandidatesFromHtml(html, finalUrl).filter(
      (candidate) => !isRejectableGenericImageUrl(candidate),
    );

    for (const candidate of candidates) {
      const nested = await downloadPaintCanImage(candidate, depth + 1);
      if (nested.success) return nested;
    }

    return {
      success: false,
      error: "No downloadable product image was found on the manufacturer page.",
    };
  }

  const finalized = finalizeDownload(buffer, mime, finalUrl);
  if (!finalized.success) return finalized;
  return { success: true, ...finalized.data };
}

export async function downloadPaintCanImageCandidate(
  candidateUrl: string,
): Promise<
  | { success: true; buffer: Buffer; mime: string; dataUrl: string; imageUrl: string }
  | { success: false; error: string }
> {
  const result = await downloadPaintCanImage(candidateUrl);
  if (!result.success) return result;
  return { ...result, imageUrl: candidateUrl };
}

export async function acquirePaintCanImage(input: {
  imageUrl: string | null;
  sourceUrl: string | null;
  paintType?: string;
  manufacturer?: string;
  applicationType?: "interior" | "exterior" | "";
  preferredImageUrl?: string | null;
}): Promise<
  | { success: true; buffer: Buffer; mime: string; dataUrl: string; imageUrl: string }
  | { success: false; error: string }
> {
  const attempts = new Set<string>();

  if (input.preferredImageUrl) {
    const preferred = await downloadPaintCanImageCandidate(
      input.preferredImageUrl,
    );
    if (preferred.success) return preferred;
    attempts.add(input.preferredImageUrl);
  }

  const candidates = await collectPaintCanImageCandidates(input);

  for (const candidate of candidates) {
    if (!candidate || attempts.has(candidate)) continue;
    attempts.add(candidate);

    const result = await downloadPaintCanImageCandidate(candidate);
    if (result.success) return result;
  }

  return {
    success: false,
    error:
      "Could not download a paint can image from the manufacturer site. Try a more specific product name or upload a photo manually.",
  };
}

export async function uploadPaintCanImage(
  companyId: string,
  tierKey: SellSheetTierKey,
  buffer: Buffer,
  mime: string,
  sellSheetId?: string,
): Promise<{ success: true; publicUrl: string } | { success: false; error: string }> {
  const folder = sellSheetId ?? "drafts";
  const path = `${companyId}/sell-sheets/${folder}/${tierKey}-can-${Date.now()}.${extensionForMime(mime)}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(STORAGE_BUCKETS.sellSheetAssets)
    .upload(path, buffer, {
      upsert: true,
      contentType: mime,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, publicUrl: getPublicUrl(path) };
}
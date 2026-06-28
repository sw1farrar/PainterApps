import { createXaiResponse } from "@/lib/xai/responses";
import {
  PAINT_SYSTEM_OPTIONS_MAX,
  PAINT_SYSTEM_TIER_MAX,
} from "@/lib/sell-sheet/sell-sheet-limits";

export const PAINT_SYSTEM_FEATURE_MAX_WORDS = 8;
export const PAINT_SYSTEM_FEATURE_MAX_CHARS = 56;
export const PAINT_SYSTEM_FEATURE_AI_TRIGGER_CHARS = 48;
export const PAINT_SYSTEM_DISPLAY_MAX = PAINT_SYSTEM_TIER_MAX;

const PAGE_FETCH_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "User-Agent":
    "Mozilla/5.0 (compatible; PainterApps/1.0; +https://painterapps.com)",
};

export function paintSystemFeaturesForDisplay(features: string[]): string[] {
  return features.slice(0, PAINT_SYSTEM_DISPLAY_MAX);
}

export function paintSystemDisplaySlots(features: string[]): string[] {
  const displayed = paintSystemFeaturesForDisplay(features);
  const slots = [...displayed];
  while (slots.length < PAINT_SYSTEM_DISPLAY_MAX) {
    slots.push("");
  }
  return slots;
}

export function isPaintSystemFeatureTooLong(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > PAINT_SYSTEM_FEATURE_MAX_WORDS ||
    text.trim().length > PAINT_SYSTEM_FEATURE_MAX_CHARS
  );
}

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

export function heuristicShortenPaintSystemFeature(text: string): string {
  let value = text
    .trim()
    .replace(/^[-•*]\s*/, "")
    .replace(
      /^(?:this\s+)?(?:product\s+)?(?:features?\s+include|provides|offers|with|includes)\s+/i,
      "",
    );

  const clause =
    value.split(/\s*[—–;]\s*|\.\s+|\s+-\s+/)[0]?.trim() ?? value;
  value = clause;

  let words = value.split(/\s+/).filter(Boolean);
  if (words.length > PAINT_SYSTEM_FEATURE_MAX_WORDS) {
    words = words.slice(0, PAINT_SYSTEM_FEATURE_MAX_WORDS);
    value = words.join(" ");
  }

  if (value.length > PAINT_SYSTEM_FEATURE_MAX_CHARS) {
    value = value.slice(0, PAINT_SYSTEM_FEATURE_MAX_CHARS);
    value = value.replace(/\s+\S*$/, "").trim();
  }

  return value.replace(/[,;:–—-]+$/, "").trim();
}

export function normalizePaintSystemFeatures(
  features: string[],
  maxItems = PAINT_SYSTEM_OPTIONS_MAX,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const feature of features) {
    const shortened = heuristicShortenPaintSystemFeature(feature);
    if (!shortened) continue;

    const key = shortened.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(shortened);
    if (result.length >= maxItems) break;
  }

  return result;
}

function stripHtmlText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikePaintSpecBullet(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 8 || trimmed.length > 140) return false;
  if (/^(?:click|learn more|read more|download|view|shop|buy)\b/i.test(trimmed)) {
    return false;
  }

  return /(?:primer|coat|coverage|mildew|stain|scrub|wash|fade|voc|odor|dry|recoat|gloss|sheen|satin|eggshell|flat|matte|durab|resist|surface|interior|exterior|application|formula|finish|seal|adhesion|warranty|touch|one-coat|self-prim)/i.test(
    trimmed,
  );
}

function extractSpecBulletsFromHtml(html: string): string[] {
  const bullets: string[] = [];

  for (const match of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = stripHtmlText(match[1] ?? "");
    if (looksLikePaintSpecBullet(text)) {
      bullets.push(text);
    }
  }

  for (const match of html.matchAll(
    /<(?:p|span|div)[^>]*class=["'][^"']*(?:feature|benefit|spec|highlight)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|span|div)>/gi,
  )) {
    const text = stripHtmlText(match[1] ?? "");
    if (looksLikePaintSpecBullet(text)) {
      bullets.push(text);
    }
  }

  return bullets;
}

export async function supplementPaintSystemFeaturesFromPage(input: {
  sourceUrl: string;
  existingFeatures: string[];
  maxItems?: number;
}): Promise<string[]> {
  const maxItems = input.maxItems ?? PAINT_SYSTEM_OPTIONS_MAX;
  if (input.existingFeatures.length >= maxItems) {
    return input.existingFeatures;
  }

  let response: Response;
  try {
    response = await fetch(input.sourceUrl, {
      headers: PAGE_FETCH_HEADERS,
      redirect: "follow",
    });
  } catch {
    return input.existingFeatures;
  }

  if (!response.ok) {
    return input.existingFeatures;
  }

  const html = await response.text();
  const discovered = extractSpecBulletsFromHtml(html);
  if (discovered.length === 0) {
    return input.existingFeatures;
  }

  return normalizePaintSystemFeatures(
    [...input.existingFeatures, ...discovered],
    maxItems,
  );
}

/** Instant post-lookup cleanup — no extra AI or network calls. */
export function preparePaintSystemFeatures(
  features: string[],
  maxItems = PAINT_SYSTEM_OPTIONS_MAX,
): string[] {
  if (features.length === 0) return [];
  return normalizePaintSystemFeatures(features, maxItems);
}

export async function condensePaintSystemFeaturesWithAi(input: {
  features: string[];
  manufacturer: string;
  paintType: string;
  maxItems?: number;
}): Promise<string[]> {
  const maxItems = input.maxItems ?? PAINT_SYSTEM_OPTIONS_MAX;
  const tooLong = input.features.filter(isPaintSystemFeatureTooLong);
  if (tooLong.length === 0) return input.features;

  const response = await createXaiResponse({
    instructions: [
      "You shorten manufacturer paint product specs into sell-sheet bullet points.",
      "Stay strictly faithful to the manufacturer's claims — do not invent specs or add benefits not implied by the source text.",
      "Return ONLY a JSON object: { paintSystemFeatures: string[] }.",
      "Return one shortened bullet for each input line, in the same order.",
      `Each bullet must be at most ${PAINT_SYSTEM_FEATURE_MAX_WORDS} words and about ${PAINT_SYSTEM_FEATURE_MAX_CHARS} characters.`,
      "Use compact phrase-style bullets, not full sentences or marketing paragraphs.",
      "Do not include markdown or commentary.",
    ].join(" "),
    prompt: [
      `Manufacturer: ${input.manufacturer}`,
      `Paint line: ${input.paintType}`,
      "Shorten only these lines:",
      ...tooLong.map((feature, index) => `${index + 1}. ${feature}`),
    ].join("\n"),
    webSearch: false,
  });

  if (!response.success) {
    return input.features;
  }

  const json = extractJsonObject(response.text);
  const raw = json?.paintSystemFeatures ?? json?.paint_system_features;

  if (!Array.isArray(raw)) {
    return input.features;
  }

  const shortened = raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (shortened.length === 0) {
    return input.features;
  }

  const replacements = new Map<string, string>();
  for (let index = 0; index < tooLong.length; index += 1) {
    const replacement = shortened[index];
    if (!replacement) continue;
    replacements.set(tooLong[index]!.toLowerCase(), replacement);
  }

  const merged = input.features.map((feature) => {
    const replacement = replacements.get(feature.toLowerCase());
    return replacement ?? feature;
  });

  return normalizePaintSystemFeatures(merged, maxItems);
}

/** @deprecated Use preparePaintSystemFeatures in the hot path. */
export async function finalizePaintSystemFeatures(
  features: string[],
  _context: { manufacturer: string; paintType: string; sourceUrl?: string | null },
  maxItems = PAINT_SYSTEM_OPTIONS_MAX,
): Promise<string[]> {
  return preparePaintSystemFeatures(features, maxItems);
}
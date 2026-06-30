import { createXaiResponse } from "@/lib/xai/responses";
import { preparePaintSystemFeatures } from "@/lib/sell-sheet/paint-system-features";
import { isRejectableGenericImageUrl } from "@/lib/sell-sheet/paint-can-trust";
import {
  PAINT_SYSTEM_DISCOVERY_TARGET_MIN,
  PAINT_SYSTEM_OPTIONS_MAX,
} from "@/lib/sell-sheet/sell-sheet-limits";
import type { SellSheetApplicationType } from "@/types/sell-sheet";

export type PaintCanAiLookupInput = {
  manufacturer: string;
  paintType: string;
  applicationType: SellSheetApplicationType;
  retryReason?: string;
  maxAttempts?: number;
};

export type PaintCanAiLookupResult =
  | {
      success: true;
      imageUrl: string;
      sourceUrl: string | null;
      paintSystemFeatures: string[];
      applicationType: SellSheetApplicationType;
      productMatchConfirmed: boolean;
    }
  | { success: false; error: string };

/** Official image CDNs used by manufacturer sites (not retailer hosts). */
const MANUFACTURER_CDN_HOST_SUFFIXES: Record<string, string[]> = {
  "sherwin-williams.com": [
    "scene7.com",
    "sw-cloud.sherwin-williams.com",
    "images.sherwin-williams.com",
    "media.sherwin-williams.com",
  ],
  "benjaminmoore.com": ["azureedge.net", "bmimg.com"],
  "behr.com": ["media.behr.com", "images.behr.com"],
  "ppgpaints.com": ["ppg.com", "scene7.com"],
  "ppg.com": ["ppgpaints.com", "scene7.com"],
  "valspar.com": ["scene7.com"],
  "dunnedwards.com": ["scene7.com"],
  "vistapaint.com": ["vistapaint.com"],
};

const MANUFACTURER_DOMAINS: Record<string, string[]> = {
  "sherwin-williams": ["sherwin-williams.com"],
  "sherwin williams": ["sherwin-williams.com"],
  "sherwin": ["sherwin-williams.com"],
  "benjamin moore": ["benjaminmoore.com"],
  "benjamin": ["benjaminmoore.com"],
  "behr": ["behr.com"],
  "ppg": ["ppgpaints.com", "ppg.com"],
  "ppg paints": ["ppgpaints.com", "ppg.com"],
  "valspar": ["valspar.com"],
  "dunn-edwards": ["dunnedwards.com"],
  "dunn edwards": ["dunnedwards.com"],
  "farrow and ball": ["farrow-ball.com"],
  "farrow & ball": ["farrow-ball.com"],
  "coronado": ["coronadopaint.com"],
  "coronado paint": ["coronadopaint.com"],
  "kelly moore": ["kellymoore.com"],
  "kelly-moore": ["kellymoore.com"],
  "glidden": ["glidden.com"],
  "minwax": ["minwax.com"],
  "rust-oleum": ["rustoleum.com"],
  "rust oleum": ["rustoleum.com"],
  "vista": ["vistapaint.com"],
  "vista paint": ["vistapaint.com"],
};

const BLOCKED_SOURCE_HOST_SUFFIXES = [
  "amazon.com",
  "homedepot.com",
  "lowes.com",
  "walmart.com",
  "target.com",
  "menards.com",
  "acehardware.com",
  "pinterest.com",
  "pinimg.com",
  "instagram.com",
  "facebook.com",
  "fbcdn.net",
  "wikipedia.org",
  "wikimedia.org",
  "youtube.com",
  "ytimg.com",
  "reddit.com",
  "imgur.com",
  "bing.com",
  "google.com",
  "gstatic.com",
  "serpapi.com",
  "wayfair.com",
  "build.com",
  "doitbest.com",
  "truevalue.com",
];

const MANUFACTURER_TOKEN_STOP_WORDS = new Set([
  "and",
  "the",
  "inc",
  "llc",
  "co",
  "company",
  "paint",
  "paints",
  "brand",
]);

const INTERIOR_URL_MARKERS = [
  /\/interior(?:\/|$|[-_])/i,
  /[-_]interior(?:\/|$|[-_.])/i,
  /[?&](?:application|type|use)=interior\b/i,
];

const EXTERIOR_URL_MARKERS = [
  /\/exterior(?:\/|$|[-_])/i,
  /[-_]exterior(?:\/|$|[-_.])/i,
  /[?&](?:application|type|use)=exterior\b/i,
];

const INTERIOR_TEXT_MARKERS = [
  /\binterior\b/i,
  /\bindoor\b/i,
  /\binside\b/i,
  /\bwall(s)?\s+and\s+ceiling/i,
  /\bfor\s+interior\s+use\b/i,
];

const EXTERIOR_TEXT_MARKERS = [
  /\bexterior\b/i,
  /\boutdoor\b/i,
  /\boutside\b/i,
  /\bsiding\b/i,
  /\bmasonry\b/i,
  /\bfor\s+exterior\s+use\b/i,
];

function normalizeManufacturerKey(value: string): string {
  return value.trim().toLowerCase();
}

function allowedDomainsForManufacturer(manufacturer: string): string[] | undefined {
  const key = normalizeManufacturerKey(manufacturer);
  if (MANUFACTURER_DOMAINS[key]) {
    return MANUFACTURER_DOMAINS[key];
  }

  for (const [alias, domains] of Object.entries(MANUFACTURER_DOMAINS)) {
    if (key.includes(alias) || alias.includes(key)) {
      return domains;
    }
  }

  return undefined;
}

function manufacturerTokens(manufacturer: string): string[] {
  return manufacturer
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(
      (token) => token.length > 2 && !MANUFACTURER_TOKEN_STOP_WORDS.has(token),
    );
}

function paintTypeTokens(paintType: string): string[] {
  const normalized = paintType.toLowerCase().replace(/[^a-z0-9]/g, "");
  const words = paintType
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

  if (normalized.length > 3 && !words.includes(normalized)) {
    words.unshift(normalized);
  }

  return words;
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isBlockedSourceHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  return BLOCKED_SOURCE_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

function hostMatchesAllowedDomains(
  hostname: string,
  allowedDomains: string[],
): boolean {
  const host = normalizeHostname(hostname);
  return allowedDomains.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

function hostMatchesManufacturerName(
  hostname: string,
  manufacturer: string,
): boolean {
  const host = normalizeHostname(hostname).replace(/[^a-z0-9]/g, "");
  const tokens = manufacturerTokens(manufacturer).map((token) =>
    token.replace(/[^a-z0-9]/g, ""),
  );

  return tokens.some((token) => token.length > 3 && host.includes(token));
}

function isOfficialManufacturerUrl(
  url: string,
  manufacturer: string,
  allowedDomains?: string[],
): boolean {
  try {
    const hostname = new URL(url).hostname;
    if (isBlockedSourceHost(hostname)) return false;

    if (allowedDomains?.length) {
      return hostMatchesAllowedDomains(hostname, allowedDomains);
    }

    return hostMatchesManufacturerName(hostname, manufacturer);
  } catch {
    return false;
  }
}

function manufacturerCdnSuffixes(allowedDomains?: string[]): string[] {
  if (!allowedDomains?.length) return [];

  const suffixes = new Set<string>();
  for (const domain of allowedDomains) {
    for (const cdn of MANUFACTURER_CDN_HOST_SUFFIXES[domain] ?? []) {
      suffixes.add(cdn);
    }
  }

  return [...suffixes];
}

function hostMatchesCdnSuffix(
  hostname: string,
  suffix: string,
  manufacturer: string,
): boolean {
  const host = normalizeHostname(hostname);
  if (!(host === suffix || host.endsWith(`.${suffix}`))) {
    return false;
  }

  if (suffix === "scene7.com") {
    const tokens = manufacturerTokens(manufacturer).map((token) =>
      token.replace(/[^a-z0-9]/g, ""),
    );
    return tokens.some((token) => token.length > 3 && host.includes(token));
  }

  return true;
}

function imageHostAllowedForManufacturer(
  hostname: string,
  manufacturer: string,
  allowedDomains?: string[],
): boolean {
  if (isOfficialManufacturerUrl(`https://${hostname}/`, manufacturer, allowedDomains)) {
    return true;
  }

  for (const suffix of manufacturerCdnSuffixes(allowedDomains)) {
    if (hostMatchesCdnSuffix(hostname, suffix, manufacturer)) {
      return true;
    }
  }

  return hostMatchesManufacturerName(hostname, manufacturer);
}

function imageSharesOfficialManufacturerOrigin(
  sourceUrl: string,
  imageUrl: string,
  manufacturer: string,
  allowedDomains?: string[],
): boolean {
  if (isOfficialManufacturerUrl(imageUrl, manufacturer, allowedDomains)) {
    return true;
  }

  try {
    const sourceHost = normalizeHostname(new URL(sourceUrl).hostname);
    const imageHost = normalizeHostname(new URL(imageUrl).hostname);

    if (imageHostAllowedForManufacturer(imageHost, manufacturer, allowedDomains)) {
      return true;
    }

    if (imageHost.endsWith(sourceHost) || sourceHost.endsWith(imageHost)) {
      return true;
    }

    if (allowedDomains?.length) {
      const sourceRoot = allowedDomains.find((domain) =>
        sourceHost.endsWith(domain),
      );
      if (sourceRoot && imageHost.endsWith(sourceRoot)) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function applicationLabel(applicationType: SellSheetApplicationType): string {
  return applicationType === "interior" ? "Interior" : "Exterior";
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

function extractImageUrl(text: string, citations: string[]): string | null {
  const json = extractJsonObject(text);
  const jsonUrl = json?.imageUrl ?? json?.image_url;
  if (typeof jsonUrl === "string" && isLikelyImageUrl(jsonUrl)) {
    return jsonUrl.trim();
  }

  const markdownMatch = text.match(/!\[[^\]]*]\((https?:\/\/[^\s)]+)\)/i);
  if (markdownMatch?.[1] && isLikelyImageUrl(markdownMatch[1])) {
    return markdownMatch[1].trim();
  }

  const directMatch = text.match(
    /(https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif)(?:\?[^\s"'<>]*)?)/i,
  );
  if (directMatch?.[1]) {
    return directMatch[1].trim();
  }

  for (const citation of citations) {
    if (isLikelyImageUrl(citation)) {
      return citation.trim();
    }
  }

  return null;
}

function extractPaintSystemFeatures(
  json: Record<string, unknown> | null,
): string[] {
  const raw =
    json?.paintSystemFeatures ??
    json?.paint_system_features ??
    json?.productFeatures ??
    json?.product_features;

  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const features: string[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    features.push(trimmed);
    if (features.length >= PAINT_SYSTEM_OPTIONS_MAX) break;
  }

  return features;
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

function readStringField(
  json: Record<string, unknown> | null,
  keys: string[],
): string | null {
  if (!json) return null;

  for (const key of keys) {
    const value = json[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readBooleanField(
  json: Record<string, unknown> | null,
  keys: string[],
): boolean | null {
  if (!json) return null;

  for (const key of keys) {
    const value = json[key];
    if (typeof value === "boolean") return value;
  }

  return null;
}

function readApplicationField(
  json: Record<string, unknown> | null,
): SellSheetApplicationType | null {
  const raw = readStringField(json, [
    "applicationType",
    "application_type",
    "confirmedApplicationType",
    "confirmed_application_type",
  ]);

  if (raw === "interior" || raw === "exterior") return raw;
  return null;
}

function countMarkerMatches(value: string, markers: RegExp[]): number {
  return markers.reduce(
    (count, marker) => (marker.test(value) ? count + 1 : count),
    0,
  );
}

function urlConflictsWithApplication(
  url: string | null,
  applicationType: SellSheetApplicationType,
): boolean {
  if (!url) return false;

  const interiorHits = countMarkerMatches(url, INTERIOR_URL_MARKERS);
  const exteriorHits = countMarkerMatches(url, EXTERIOR_URL_MARKERS);

  if (applicationType === "interior") {
    return exteriorHits > 0 && interiorHits === 0;
  }

  return interiorHits > 0 && exteriorHits === 0;
}

type ApplicationSignalScore = {
  interior: number;
  exterior: number;
};

function scoreApplicationSignals(text: string): ApplicationSignalScore {
  return {
    interior: countMarkerMatches(text, INTERIOR_TEXT_MARKERS),
    exterior: countMarkerMatches(text, EXTERIOR_TEXT_MARKERS),
  };
}

function oppositeApplication(
  applicationType: SellSheetApplicationType,
): SellSheetApplicationType {
  return applicationType === "interior" ? "exterior" : "interior";
}

type ProductMatchValidation =
  | { valid: true; productMatchConfirmed: boolean }
  | { valid: false; reason: string };

type ProductMatchValidationMode = "strict" | "relaxed";

const MAX_GROK_LOOKUP_ATTEMPTS = 3;

function textCorroboratesProductLine(text: string, paintType: string): boolean {
  const haystack = text.toLowerCase();
  const compactHaystack = haystack.replace(/[^a-z0-9]/g, "");

  const slug = paintType.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (slug.length >= 4 && compactHaystack.includes(slug)) {
    return true;
  }

  const hyphenSlug = paintType
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (hyphenSlug.length >= 4 && haystack.includes(hyphenSlug)) {
    return true;
  }

  const tokens = paintTypeTokens(paintType);
  const significant = tokens.filter((token) => token.length > 3);
  if (significant.length === 0) {
    return tokens.some((token) => haystack.includes(token));
  }

  const matched = significant.filter((token) => haystack.includes(token)).length;
  return (
    matched >= Math.max(2, Math.ceil(significant.length * 0.5)) ||
    (significant.length === 1 && matched === 1)
  );
}

function textCorroboratesManufacturer(
  text: string,
  manufacturer: string,
): boolean {
  const tokens = manufacturerTokens(manufacturer);
  if (tokens.length === 0) return false;

  const haystack = text.toLowerCase();
  return tokens.some((token) => haystack.includes(token));
}

type ParsedLookupResponse = {
  json: Record<string, unknown> | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  paintSystemFeatures: string[];
};

function validateOfficialManufacturerSources(input: {
  manufacturer: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  allowedDomains?: string[];
}): ProductMatchValidation | { valid: true } {
  const { manufacturer, sourceUrl, allowedDomains } = input;

  if (!sourceUrl) {
    return {
      valid: false,
      reason:
        "No official manufacturer product page was found. Try a more specific paint line name.",
    };
  }

  if (!isOfficialManufacturerUrl(sourceUrl, manufacturer, allowedDomains)) {
    return {
      valid: false,
      reason:
        "The product page must be on the manufacturer's official website — not a retailer, distributor, or third-party site.",
    };
  }

  return { valid: true };
}

function sanitizeParsedLookupUrls(
  parsed: ParsedLookupResponse,
  manufacturer: string,
  allowedDomains?: string[],
): ParsedLookupResponse {
  if (!parsed.sourceUrl) return parsed;

  if (!isOfficialManufacturerUrl(parsed.sourceUrl, manufacturer, allowedDomains)) {
    return parsed;
  }

  if (parsed.imageUrl && isRejectableGenericImageUrl(parsed.imageUrl)) {
    return { ...parsed, imageUrl: null };
  }

  if (
    parsed.imageUrl &&
    !imageSharesOfficialManufacturerOrigin(
      parsed.sourceUrl,
      parsed.imageUrl,
      manufacturer,
      allowedDomains,
    )
  ) {
    return { ...parsed, imageUrl: null };
  }

  return parsed;
}

function validateProductMatch(
  input: {
    requestedApplicationType: SellSheetApplicationType;
    manufacturer: string;
    paintType: string;
    allowedDomains?: string[];
    json: Record<string, unknown> | null;
    sourceUrl: string | null;
    imageUrl: string | null;
    responseText: string;
  },
  mode: ProductMatchValidationMode = "strict",
): ProductMatchValidation {
  const {
    requestedApplicationType,
    manufacturer,
    paintType,
    allowedDomains,
    json,
    sourceUrl,
    imageUrl,
    responseText,
  } = input;

  const officialSourceCheck = validateOfficialManufacturerSources({
    manufacturer,
    sourceUrl,
    imageUrl,
    allowedDomains,
  });
  if (!officialSourceCheck.valid) {
    return officialSourceCheck;
  }

  const confirmedByModel = readBooleanField(json, [
    "productMatchConfirmed",
    "product_match_confirmed",
  ]);
  const declaredApplication = readApplicationField(json);
  const productName = readStringField(json, [
    "productName",
    "product_name",
    "matchedProductName",
    "matched_product_name",
  ]);
  const matchEvidence = readStringField(json, [
    "productMatchEvidence",
    "product_match_evidence",
    "matchEvidence",
    "match_evidence",
  ]);

  if (declaredApplication && declaredApplication !== requestedApplicationType) {
    return {
      valid: false,
      reason: `AI returned a ${declaredApplication} product, but this sell sheet is set to ${requestedApplicationType}.`,
    };
  }

  for (const url of [sourceUrl, imageUrl]) {
    if (urlConflictsWithApplication(url, requestedApplicationType)) {
      return {
        valid: false,
        reason: `The manufacturer link looks like a ${oppositeApplication(requestedApplicationType)} product, not ${requestedApplicationType}.`,
      };
    }
  }

  const corroborationText = [
    manufacturer,
    paintType,
    productName,
    matchEvidence,
    sourceUrl,
    imageUrl,
    responseText,
  ]
    .filter(Boolean)
    .join("\n");

  const productLineMatch = textCorroboratesProductLine(
    corroborationText,
    paintType,
  );
  const manufacturerMatch =
    textCorroboratesManufacturer(corroborationText, manufacturer) ||
    Boolean(
      sourceUrl &&
        isOfficialManufacturerUrl(sourceUrl, manufacturer, allowedDomains),
    );

  const signals = scoreApplicationSignals(corroborationText);
  const requestedScore =
    requestedApplicationType === "interior"
      ? signals.interior
      : signals.exterior;
  const oppositeScore =
    requestedApplicationType === "interior"
      ? signals.exterior
      : signals.interior;

  if (oppositeScore > 0 && oppositeScore > requestedScore) {
    return {
      valid: false,
      reason: `Found a ${oppositeApplication(requestedApplicationType)} product instead of the ${requestedApplicationType} version. Try a more specific ${requestedApplicationType} paint line name.`,
    };
  }

  if (
    mode === "strict" &&
    requestedScore === 0 &&
    oppositeScore > 0 &&
    !productLineMatch
  ) {
    return {
      valid: false,
      reason: `Could not verify this is the ${requestedApplicationType} version of the product.`,
    };
  }

  const relaxedProductMatch =
    mode === "relaxed" &&
    productLineMatch &&
    manufacturerMatch &&
    oppositeScore === 0;

  const productMatchConfirmed =
    confirmedByModel === true ||
    declaredApplication === requestedApplicationType ||
    requestedScore > 0 ||
    relaxedProductMatch ||
    (mode === "relaxed" && productLineMatch && manufacturerMatch);

  if (
    mode === "strict" &&
    confirmedByModel === false &&
    !productMatchConfirmed
  ) {
    return {
      valid: false,
      reason: `Could not confirm a matching ${requestedApplicationType} product on the manufacturer site.`,
    };
  }

  if (!productMatchConfirmed) {
    return {
      valid: false,
      reason: `Could not corroborate the ${requestedApplicationType} product match. Try a more specific paint line name.`,
    };
  }

  const paintCanConfirmed = readBooleanField(json, [
    "paintCanConfirmed",
    "paint_can_confirmed",
  ]);
  const paintCanLabelEvidence = readStringField(json, [
    "paintCanLabelEvidence",
    "paint_can_label_evidence",
    "visibleLabelText",
    "visible_label_text",
  ]);

  if (imageUrl && paintCanConfirmed === false && mode === "strict") {
    return {
      valid: false,
      reason:
        paintCanLabelEvidence ??
        "The image is not a labeled paint can matching the selected manufacturer and paint line.",
    };
  }

  if (imageUrl && paintCanConfirmed !== true && mode === "strict") {
    const lineTokens = paintTypeTokens(paintType);
    const evidence = paintCanLabelEvidence ?? matchEvidence ?? "";
    const hasMfrEvidence =
      evidence &&
      manufacturerTokens(manufacturer).some((token) =>
        evidence.toLowerCase().includes(token),
      );
    const hasLineEvidence =
      evidence &&
      lineTokens.some((token) => evidence.toLowerCase().includes(token));

    if (!hasMfrEvidence || !hasLineEvidence) {
      if (!(productLineMatch && manufacturerMatch)) {
        return {
          valid: false,
          reason:
            "Could not confirm the image shows a paint can with labeling that matches the selected manufacturer and paint line.",
        };
      }
    }
  }

  return { valid: true, productMatchConfirmed: true };
}

function buildLookupInstructions(
  manufacturer: string,
  allowedDomains?: string[],
  relaxed = false,
): string {
  const officialSiteRule = allowedDomains?.length
    ? `Use ONLY the official manufacturer website. Allowed domains: ${allowedDomains.join(", ")}.`
    : `Use ONLY the official ${manufacturer} website. Identify the manufacturer's own domain and use no other site.`;

  const applicationRule = relaxed
    ? [
        "The requested interior/exterior type is preferred, but many official product pages list a paint line without saying interior or exterior in the URL.",
        "If the official product page clearly matches the paint line name, set productMatchConfirmed to true and set applicationType to the requested value when the product supports that use.",
        "Do not reject a correct paint line just because the page is multi-surface or does not repeat interior/exterior in the URL.",
      ]
    : [
        "The sell sheet application type (interior or exterior) is mandatory — never return the wrong variant.",
        "productMatchConfirmed must be true only if the official manufacturer product page matches the requested interior/exterior variant.",
      ];

  return [
    "You help painting contractors build marketing sell sheets.",
    officialSiteRule,
    "STRICT SOURCE RULE: sourceUrl, imageUrl, productName, and paintSystemFeatures must come exclusively from the manufacturer's official website.",
    "Never use retailers, distributors, marketplaces, social media, review sites, blogs, Wikipedia, or reverse image search results.",
    "Never use Home Depot, Lowe's, Amazon, Walmart, Pinterest, or any third-party product listing.",
    "The paint can image must be hosted on the manufacturer's official site or its official CDN on the same domain family.",
    "imageUrl must be a direct photo of a physical paint can or bucket with a readable product label — never a brochure, sell sheet, literature PDF, flyer, data sheet, product overview graphic, swatch, chip, brush, logo-only graphic, lifestyle photo, or unlabeled container.",
    "Prefer official manufacturer paint-can packshot URLs when available. Never return brochure, literature, hero banner, or document images as imageUrl.",
    "Use image understanding to verify the candidate image is a labeled paint can before returning imageUrl. Reject brochure covers, document scans, and marketing collateral.",
    "paintSystemFeatures must come from the manufacturer product page only — do not invent specs or use third-party descriptions.",
    `paintSystemFeatures must be ${PAINT_SYSTEM_DISCOVERY_TARGET_MIN}-${PAINT_SYSTEM_OPTIONS_MAX} very short bullet phrases (max 8 words, ~50 characters each) extracted comprehensively from the manufacturer product page.`,
    "Include every distinct coating spec and performance claim on the page — finish/sheen, coverage, self-priming, mildew resistance, stain and scrub resistance, washability, fade resistance, VOC or low-odor claims, dry and recoat time, application surfaces, durability, and warranty highlights.",
    "Do not stop at only top marketing highlights; capture the full spec list so contractors can choose the best three for their sell sheet.",
    "Distill manufacturer wording into compact scannable bullets while staying factually accurate (e.g. 'Self-priming one-coat coverage', 'Mildew resistant finish'). Never full sentences or long marketing copy.",
    ...applicationRule,
    "Return ONLY a single JSON object with keys:",
    "applicationType, productMatchConfirmed, productMatchEvidence, productName, paintCanConfirmed, paintCanLabelEvidence, imageUrl, sourceUrl, paintSystemFeatures.",
    "applicationType must be exactly interior or exterior.",
    "paintCanConfirmed must be true only if imageUrl shows a paint can with label branding that matches the expected manufacturer and paint line.",
    "paintCanLabelEvidence must describe the manufacturer name and product line text visible on the can label.",
    "productMatchEvidence must be one short sentence citing how you verified the official manufacturer page (page title, URL slug, SKU, or label text).",
    "productName must be the exact matched product name from the manufacturer site.",
    "imageUrl should be a direct HTTPS image URL from the manufacturer site when possible (.jpg, .jpeg, .png, .webp, or official CDN media URL). If only a product page exists, put that in sourceUrl and leave imageUrl null.",
    "sourceUrl must be the official manufacturer product page you used — never a retailer URL.",
    relaxed
      ? "If you find the correct official product page for the paint line, set productMatchConfirmed to true even when the image must be loaded from that page."
      : "If you cannot find the product on the manufacturer's official website, set productMatchConfirmed to false.",
    "Do not include markdown, commentary, or code fences.",
  ].join(" ");
}

function paintTypeSearchVariants(paintType: string): string[] {
  const trimmed = paintType.trim();
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const variants = new Set<string>([trimmed]);
  if (slug) variants.add(slug);

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 2) {
    variants.add(`${words[0]} ${words[words.length - 1]}`);
  }

  return [...variants];
}

function buildLookupPrompt(
  input: PaintCanAiLookupInput,
  options?: { retryReason?: string; relaxed?: boolean },
): string {
  const manufacturer = input.manufacturer.trim();
  const paintType = input.paintType.trim();
  const applicationLabel = applicationLabelFor(input.applicationType);
  const oppositeLabel = applicationLabelFor(oppositeApplication(input.applicationType));

  const allowedDomains = allowedDomainsForManufacturer(manufacturer);
  const siteDomain =
    allowedDomains?.[0] ?? manufacturer.toLowerCase().replace(/\s+/g, "");
  const searchVariants = paintTypeSearchVariants(paintType);

  const lines = [
    `Required application type: ${input.applicationType} (${applicationLabel})`,
    `Manufacturer: ${manufacturer}`,
    `Paint product line: ${paintType}`,
    allowedDomains?.length
      ? `Official website only: ${allowedDomains.join(", ")}`
      : `Official ${manufacturer} website only — do not use retailers or third-party sites.`,
    options?.relaxed
      ? `Find the official ${manufacturer} product page for "${paintType}". Prefer the ${applicationLabel} variant when listed, but accept the correct paint line page even if interior/exterior is not in the URL.`
      : `Search only the manufacturer's official website for the ${applicationLabel} version of this product.`,
    options?.relaxed
      ? "If you find the correct official product page, set productMatchConfirmed to true and return sourceUrl even if you cannot find a direct image URL."
      : `Reject ${oppositeLabel}-only variants, retailer listings, or images that clearly contradict ${applicationLabel}.`,
    "Before returning imageUrl, visually confirm it is a paint can photo with readable label text matching the manufacturer and paint line.",
    "Return a paint can product image — never a brochure, sell sheet, literature page, color chip, swatch, or marketing lifestyle photo — plus very short paint-system feature bullets distilled from that page.",
    "Do not use images or specs from Home Depot, Lowe's, Amazon, Pinterest, or any non-manufacturer source.",
    `Try these official-site searches: ${searchVariants
      .map(
        (variant) =>
          `site:${siteDomain} ${variant}${options?.relaxed ? "" : ` ${applicationLabel}`}`,
      )
      .join("; ")}`,
  ];

  if (options?.retryReason) {
    lines.push(`Previous attempt failed validation: ${options.retryReason}`);
    lines.push(
      options.relaxed
        ? `Search again on the manufacturer's official website. Find the product page whose title or URL slug matches "${paintType}" and return sourceUrl.`
        : `Search again on the manufacturer's official website only and confirm the ${applicationLabel} product before returning results.`,
    );
  }

  return lines.join("\n");
}

function applicationLabelFor(
  applicationType: SellSheetApplicationType,
): string {
  return applicationLabel(applicationType);
}

function parseLookupResponse(
  text: string,
  citations: string[],
): ParsedLookupResponse {
  const json = extractJsonObject(text);
  const sourceUrl =
    readStringField(json, ["sourceUrl", "source_url"]) ?? citations[0] ?? null;

  const rawImageUrl = extractImageUrl(text, citations);
  const imageUrl =
    rawImageUrl && isLikelyImageUrl(rawImageUrl) ? rawImageUrl : null;

  return {
    json,
    sourceUrl,
    imageUrl,
    paintSystemFeatures: extractPaintSystemFeatures(json),
  };
}

async function runLookupAttempt(
  input: PaintCanAiLookupInput,
  options?: { retryReason?: string; relaxed?: boolean },
): Promise<
  | { success: true; parsed: ParsedLookupResponse; responseText: string }
  | { success: false; error: string }
> {
  const allowedDomains = allowedDomainsForManufacturer(input.manufacturer);
  const relaxed = options?.relaxed ?? false;

  const response = await createXaiResponse({
    instructions: buildLookupInstructions(
      input.manufacturer,
      allowedDomains,
      relaxed,
    ),
    prompt: buildLookupPrompt(input, options),
    webSearch: allowedDomains ? { allowedDomains } : true,
  });

  if (!response.success) {
    return { success: false, error: response.error };
  }

  const parsed = parseLookupResponse(response.text, response.citations);

  if (!parsed.imageUrl && !parsed.sourceUrl) {
    return {
      success: false,
      error:
        "Could not find a paint can image for that product. Try a more specific paint line name or upload a photo manually.",
    };
  }

  return {
    success: true,
    parsed,
    responseText: response.text,
  };
}

export async function findPaintCanImageWithGrok(
  input: PaintCanAiLookupInput,
): Promise<PaintCanAiLookupResult> {
  const manufacturer = input.manufacturer.trim();
  const paintType = input.paintType.trim();
  const applicationType = input.applicationType;

  if (!manufacturer || !paintType || !applicationType) {
    return {
      success: false,
      error:
        "Select interior or exterior and enter the manufacturer and paint line before using AI.",
    };
  }

  const normalizedInput = { manufacturer, paintType, applicationType };
  const allowedDomains = allowedDomainsForManufacturer(manufacturer);
  const maxAttempts = Math.min(
    Math.max(1, input.maxAttempts ?? MAX_GROK_LOOKUP_ATTEMPTS),
    MAX_GROK_LOOKUP_ATTEMPTS,
  );

  let lastError =
    input.retryReason ??
    `Could not confirm a matching ${applicationType} product on the manufacturer site.`;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const relaxed = attempt >= maxAttempts - 1;
    const lookupAttempt = await runLookupAttempt(normalizedInput, {
      retryReason: attempt > 0 ? lastError : input.retryReason,
      relaxed,
    });

    if (!lookupAttempt.success) {
      lastError = lookupAttempt.error;
      continue;
    }

    const parsed = sanitizeParsedLookupUrls(
      lookupAttempt.parsed,
      manufacturer,
      allowedDomains,
    );
    const responseText = lookupAttempt.responseText;

    const validationInput = {
      requestedApplicationType: applicationType,
      manufacturer,
      paintType,
      allowedDomains,
      json: parsed.json,
      sourceUrl: parsed.sourceUrl,
      imageUrl: parsed.imageUrl,
      responseText,
    };

    for (const mode of ["strict", "relaxed"] as const) {
      const validation = validateProductMatch(validationInput, mode);
      if (!validation.valid) {
        lastError = validation.reason;
        continue;
      }

      const paintSystemFeatures = preparePaintSystemFeatures(
        parsed.paintSystemFeatures,
        PAINT_SYSTEM_OPTIONS_MAX,
      );

      return {
        success: true,
        imageUrl: parsed.imageUrl ?? parsed.sourceUrl!,
        sourceUrl: parsed.sourceUrl,
        paintSystemFeatures,
        applicationType,
        productMatchConfirmed: validation.productMatchConfirmed,
      };
    }
  }

  return { success: false, error: lastError };
}

/** Merge catalog official_domains with known manufacturer aliases. */
export function resolveManufacturerAllowedDomains(
  manufacturer: string,
  officialDomains: string[] = [],
): string[] {
  const merged = new Set<string>();

  for (const domain of officialDomains) {
    const trimmed = domain.trim().toLowerCase().replace(/^www\./, "");
    if (trimmed) merged.add(trimmed);
  }

  for (const domain of allowedDomainsForManufacturer(manufacturer) ?? []) {
    merged.add(domain);
  }

  return [...merged];
}

/** True when the image (and optional source page) originate from the manufacturer site or its CDN. */
export function isManufacturerImageOrigin(input: {
  imageUrl: string;
  sourceUrl?: string | null;
  manufacturer: string;
  officialDomains?: string[];
}): boolean {
  const allowedDomains = resolveManufacturerAllowedDomains(
    input.manufacturer,
    input.officialDomains ?? [],
  );
  const allowed = allowedDomains.length > 0 ? allowedDomains : undefined;

  try {
    if (
      isOfficialManufacturerUrl(input.imageUrl, input.manufacturer, allowed)
    ) {
      return true;
    }

    const imageHost = normalizeHostname(new URL(input.imageUrl).hostname);
    if (imageHostAllowedForManufacturer(imageHost, input.manufacturer, allowed)) {
      return true;
    }

    if (input.sourceUrl?.trim()) {
      return imageSharesOfficialManufacturerOrigin(
        input.sourceUrl,
        input.imageUrl,
        input.manufacturer,
        allowed,
      );
    }
  } catch {
    return false;
  }

  return false;
}
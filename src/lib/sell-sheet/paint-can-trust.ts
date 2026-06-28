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

const GENERIC_IMAGE_URL_MARKERS =
  /(?:transparent|loading|close_normal|error_icon|success_icon|warning_icon|logo|segment-logo|favicon|sprite|banner|avatar|social|pixel|bopis|splash|newsletter|perks|footer|branding|auto_logo|color1\/|%\{\{|%7B%7B|\{\{)/i;

const GENERIC_SCENE7_ASSETS =
  /scene7\.com\/is\/image\/(?:sw\/paint_template|[^/]+\/)(?:us|branding|bg-logo|paint_perks|sw-newsletter|footer)\b/i;

const SHERWIN_SCENE7_PAINT_CAN_ASSET =
  /scene7\.com\/is\/image\/sw\/(?:paint_template-1\?|.*(?:Parent|_1G_|Acrylic_Ltx|Gallon))/i;

const BROCHURE_IMAGE_URL_MARKERS =
  /(?:brochure|sell[-_]?sheet|data[-_]?sheet|fact[-_]?sheet|literature|collateral|flyer|pamphlet|leaflet|tri[-_]?fold|spec[-_]?sheet|product[-_]?guide|marketing[-_]?material|msds|sds[-_]?sheet|document|catalog(?:ue)?[-_]?page|info[-_]?sheet|product[-_]?info|coverage[-_]?chart|color[-_]?card|chip[-_]?card|application[-_]?guide|technical[-_]?bulletin|tearsheet|tear[-_]?sheet|one[-_]?pager|sellsheet|downloadable|pdf[-_]?thumb|page[-_]?scan|overview|resource|inspiration|lifestyle|room[-_]?scene|sellsheet)/i;

const COLLATERAL_IMAGE_URL_MARKERS =
  /(?:hero(?!-product)|banner|overview|resources\/|inspiration|gallery|room[-_]?scene|lifestyle|lookbook|magazine|newsletter)/i;

const BROCHURE_ALT_TEXT_MARKERS =
  /(?:brochure|sell[-\s]?sheet|literature|flyer|pamphlet|leaflet|data[-\s]?sheet|fact[-\s]?sheet|collateral|document|catalog(?:ue)?|guide|bulletin|coverage[-\s]?chart|color[-\s]?card|application[-\s]?guide|technical[-\s]?sheet|one[-\s]?pager)/i;

const PAINT_CAN_POSITIVE_URL_MARKERS =
  /(?:packshot|pack[-_]?shot|paint[-_]?can|gallon|bucket|quart|container|product[-_]?shot|sw-img-promo|hero[-_]?product|product[-_]?pack)/i;

const PAINT_CAN_POSITIVE_ALT_MARKERS =
  /(?:paint[-\s]?can|gallon|bucket|quart|packshot|pack[-\s]?shot|product[-\s]?shot|container)/i;

const PRODUCT_IMAGE_URL_MARKERS = PAINT_CAN_POSITIVE_URL_MARKERS;

/** Generic paint words — must not be the sole basis for auto-accept label matching. */
const GENERIC_PRODUCT_LINE_TOKENS = new Set([
  "primer",
  "primers",
  "paint",
  "paints",
  "latex",
  "acrylic",
  "enamel",
  "interior",
  "exterior",
  "int",
  "ext",
  "flat",
  "matte",
  "satin",
  "gloss",
  "semi",
  "ultra",
  "super",
  "sealer",
  "sealers",
  "undercoater",
  "undercoat",
  "base",
  "coat",
  "coats",
  "one",
  "water",
  "based",
  "oil",
  "alkyd",
  "vinyl",
  "urethane",
  "series",
  "formula",
  "grade",
  "wall",
  "walls",
  "trim",
  "ceiling",
  "ceilings",
  "masonry",
  "stucco",
  "siding",
  "multi",
  "surface",
  "surfaces",
  "high",
  "hiding",
  "coverage",
  "washable",
  "scrubbable",
  "zero",
  "voc",
  "low",
  "odor",
  "finish",
  "sheen",
]);

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

/** Shorter names for web image search when the full catalog title is long. */
export function productLineSearchVariants(productName: string): string[] {
  const trimmed = productName.trim();
  if (!trimmed) return [];

  const variants = new Set<string>([trimmed]);

  const withoutScope = trimmed
    .replace(/\b(interior|exterior|int\.?|ext\.?|indoor|outdoor)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutScope.length >= 3 && withoutScope !== trimmed) {
    variants.add(withoutScope);
  }

  const words = trimmed.split(/\s+/).filter((word) => word.length > 1);
  if (words.length > 4) {
    variants.add(words.slice(0, 4).join(" "));
  }
  if (words.length > 3) {
    variants.add(words.slice(0, 3).join(" "));
  }

  return [...variants];
}

export function paintTypeTokens(paintType: string): string[] {
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

function nonGenericProductWords(paintType: string): string[] {
  return paintType
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) => word.length > 0 && !GENERIC_PRODUCT_LINE_TOKENS.has(word),
    );
}

function distinctiveProductLineTokens(paintType: string): string[] {
  return nonGenericProductWords(paintType);
}

/** Product-line tier words (Select vs Premium, etc.) — must match on the can label when present in the catalog name. */
const PRODUCT_TIER_MARKERS = [
  "select",
  "premium",
  "professional",
  "standard",
  "elite",
  "economy",
  "ultragrip",
] as const;

export function productTierMarkers(paintType: string): string[] {
  const haystack = paintType.toLowerCase();
  const compactHaystack = haystack.replace(/[^a-z0-9]/g, "");

  return PRODUCT_TIER_MARKERS.filter((tier) => {
    if (tier.length <= 2) {
      return new RegExp(`(?:^|[^a-z0-9])${tier}(?:[^a-z0-9]|$)`, "i").test(
        haystack,
      );
    }
    return (
      haystack.includes(tier) ||
      (tier.length >= 4 && compactHaystack.includes(tier))
    );
  });
}

export function textCorroboratesProductTierMarkers(
  labelText: string,
  paintType: string,
): boolean {
  const requiredTiers = productTierMarkers(paintType);
  if (requiredTiers.length === 0) return true;

  const haystack = labelText.trim().toLowerCase();
  if (!haystack) return false;

  const compactHaystack = haystack.replace(/[^a-z0-9]/g, "");
  return requiredTiers.every((tier) =>
    labelWordMatches(tier, haystack, compactHaystack),
  );
}

function productModelNumberTokens(paintType: string): string[] {
  return [...paintType.matchAll(/\b(\d{3,5})\b/g)].map((match) => match[1]!);
}

export function textCorroboratesProductModelNumbers(
  labelText: string,
  paintType: string,
): boolean {
  const modelNumbers = productModelNumberTokens(paintType);
  if (modelNumbers.length === 0) return true;

  const haystack = labelText.toLowerCase();
  return modelNumbers.every((value) => haystack.includes(value));
}

function labelWordMatches(
  word: string,
  haystack: string,
  compactHaystack: string,
): boolean {
  if (!word) return false;

  if (word.length <= 2) {
    const re = new RegExp(`(?:^|[^a-z0-9])${word}(?:[^a-z0-9]|$)`, "i");
    return re.test(haystack) || compactHaystack.includes(word);
  }

  if (haystack.includes(word)) return true;

  const compactWord = word.replace(/[^a-z0-9]/g, "");
  return compactWord.length >= 3 && compactHaystack.includes(compactWord);
}

/**
 * Stricter label check for catalog auto-apply: visible can text must include
 * distinctive product-line wording, not just generic words like "primer".
 */
export function textCorroboratesProductLineStrict(
  labelText: string,
  paintType: string,
): boolean {
  const haystack = labelText.trim().toLowerCase();
  if (!haystack) return false;

  if (!textCorroboratesProductTierMarkers(labelText, paintType)) {
    return false;
  }

  if (!textCorroboratesProductModelNumbers(labelText, paintType)) {
    return false;
  }

  const compactHaystack = haystack.replace(/[^a-z0-9]/g, "");
  const compactProduct = paintType.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (compactProduct.length >= 5 && compactHaystack.includes(compactProduct)) {
    return true;
  }

  const hyphenSlug = paintType
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (hyphenSlug.length >= 5 && haystack.includes(hyphenSlug)) {
    return true;
  }

  const distinctive = distinctiveProductLineTokens(paintType);
  const nonGenericWords = nonGenericProductWords(paintType);

  const countMatchedWords = (words: string[]) =>
    words.filter((word) => labelWordMatches(word, haystack, compactHaystack))
      .length;

  if (distinctive.length >= 2) {
    const matchedDistinctive = countMatchedWords(distinctive);
    return matchedDistinctive >= Math.max(2, Math.ceil(distinctive.length * 0.6));
  }

  if (distinctive.length === 1) {
    return countMatchedWords(nonGenericWords) >= 2;
  }

  if (nonGenericWords.length >= 2) {
    return countMatchedWords(nonGenericWords) >= 2;
  }

  return (
    compactProduct.length >= 4 && compactHaystack.includes(compactProduct)
  );
}

export function textCorroboratesProductLine(
  text: string,
  paintType: string,
): boolean {
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

export function textCorroboratesManufacturer(
  text: string,
  manufacturer: string,
): boolean {
  const tokens = manufacturerTokens(manufacturer);
  if (tokens.length === 0) return false;

  const haystack = text.toLowerCase();
  return tokens.some((token) => haystack.includes(token));
}

export function isBrochureLikeImageUrl(url: string): boolean {
  return BROCHURE_IMAGE_URL_MARKERS.test(url);
}

export function isBrochureLikeAltText(altText: string): boolean {
  return BROCHURE_ALT_TEXT_MARKERS.test(altText);
}

export function isRejectableGenericImageUrl(url: string): boolean {
  if (GENERIC_IMAGE_URL_MARKERS.test(url)) return true;
  if (GENERIC_SCENE7_ASSETS.test(url)) return true;
  if (COLLATERAL_IMAGE_URL_MARKERS.test(url)) return true;
  if (isBrochureLikeImageUrl(url)) return true;
  if (
    /images\.sherwin-williams\.com\/content_images\//i.test(url) &&
    !/sw-img-promo-/i.test(url) &&
    !PAINT_CAN_POSITIVE_URL_MARKERS.test(url)
  ) {
    return true;
  }
  if (/\.gif(?:\?|$)/i.test(url) && /(?:transparent|loading|pixel)/i.test(url)) {
    return true;
  }
  return false;
}

/** Sherwin official can packshots — safe to trust without vision when slug matches. */
export function isSherwinPromoPackshotUrl(url: string): boolean {
  if (isRejectableGenericImageUrl(url)) return false;
  if (/sw-img-promo-/i.test(url)) return true;
  return SHERWIN_SCENE7_PAINT_CAN_ASSET.test(url);
}

function sherwinUnderscoreProductSlug(paintType: string): string {
  return paintType
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase().replace(/[^a-z0-9]/gi, ""),
    )
    .join("_");
}

function sherwinScene7AssetSuffixes(
  applicationType?: "interior" | "exterior" | "",
): string[] {
  const ext = [
    "Ext_Acrylic_Ltx_1G_Parent",
    "Ext_Acrylic_Latex_1G_Parent",
    "Ext_1G_Parent",
  ];
  const int = [
    "Int_Acrylic_Ltx_1G_Parent",
    "Int_Acrylic_Latex_1G_Parent",
    "Int_1G_Parent",
  ];

  if (applicationType === "exterior") return [...ext, ...int];
  if (applicationType === "interior") return [...int, ...ext];
  return [...ext, ...int];
}

export function buildSherwinScene7ImageCandidates(
  paintType: string,
  applicationType?: "interior" | "exterior" | "",
): string[] {
  const baseSlug = sherwinUnderscoreProductSlug(paintType);
  if (!baseSlug || baseSlug.length < 4) return [];

  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (asset: string, template = false) => {
    const direct = `https://sherwin.scene7.com/is/image/sw/${asset}`;
    if (!seen.has(direct)) {
      seen.add(direct);
      ordered.push(direct);
    }

    if (template) {
      const composite = `https://sherwin.scene7.com/is/image/sw/paint_template-1?wid=600&hei=600&layer=1&src=sw/${asset}`;
      if (!seen.has(composite)) {
        seen.add(composite);
        ordered.push(composite);
      }
    }
  };

  for (const suffix of sherwinScene7AssetSuffixes(applicationType)) {
    push(`${baseSlug}_${suffix}`, true);
  }

  push(`${baseSlug}_1G_Parent`);
  push(`${baseSlug}_Parent`);

  return ordered;
}

export function isKnownPaintCanPackshotUrl(url: string): boolean {
  if (isRejectableGenericImageUrl(url)) return false;
  if (isSherwinPromoPackshotUrl(url)) return true;

  if (PAINT_CAN_POSITIVE_URL_MARKERS.test(url)) return true;

  if (
    /scene7\.com\/is\/image/i.test(url) &&
    !GENERIC_SCENE7_ASSETS.test(url) &&
    /(?:packshot|pack-shot|paint-can|gallon|bucket|quart|container)/i.test(url)
  ) {
    return true;
  }

  return false;
}

export function canSkipPaintCanVisionVerify(input: {
  imageUrl: string;
  sourceUrl: string | null;
  manufacturer: string;
  paintType: string;
}): boolean {
  if (!isSherwinPromoPackshotUrl(input.imageUrl)) return false;
  return textCorroboratesProductLine(input.imageUrl, input.paintType);
}

export function imageUrlCorroboratesProduct(
  imageUrl: string,
  paintType: string,
  manufacturer?: string,
): boolean {
  if (isRejectableGenericImageUrl(imageUrl)) return false;
  if (!isKnownPaintCanPackshotUrl(imageUrl)) return false;

  if (textCorroboratesProductLine(imageUrl, paintType)) return true;

  if (manufacturer && textCorroboratesManufacturer(imageUrl, manufacturer)) {
    return PRODUCT_IMAGE_URL_MARKERS.test(imageUrl);
  }

  return false;
}

export function buildManufacturerPromoImageCandidates(
  manufacturer: string,
  paintType: string,
  applicationType?: "interior" | "exterior" | "",
): string[] {
  const key = manufacturer.trim().toLowerCase();
  if (!key.includes("sherwin")) return [];

  const ordered: string[] = [
    ...buildSherwinScene7ImageCandidates(paintType, applicationType),
  ];
  const seen = new Set(ordered);

  const words = paintType
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length > 0) {
    const slugs = new Set<string>();
    slugs.add(words.join("-"));
    slugs.add(words.join(""));

    if (words.length >= 2) {
      const lastWord = words[words.length - 1]!;
      const abbreviatedTail = lastWord.slice(0, 3);
      slugs.add([...words.slice(0, -1), abbreviatedTail].join("-"));
      slugs.add(`${words.slice(0, -1).join("-")}${abbreviatedTail}`);
      slugs.add(`${words.slice(0, -1).join("")}${abbreviatedTail}`);
    }

    for (const slug of slugs) {
      const legacy = `https://images.sherwin-williams.com/content_images/sw-img-promo-${slug}.jpg`;
      if (!seen.has(legacy)) {
        seen.add(legacy);
        ordered.push(legacy);
      }
    }
  }

  return ordered;
}

export type OfficialProductTrustInput = {
  manufacturer: string;
  paintType: string;
  sourceUrl: string | null;
  imageUrl?: string | null;
};

export function officialProductContextTrusted(
  input: OfficialProductTrustInput,
): boolean {
  if (!input.sourceUrl) return false;

  const corroboration = [input.sourceUrl, input.imageUrl ?? ""].join("\n");
  return (
    textCorroboratesProductLine(corroboration, input.paintType) &&
    (textCorroboratesManufacturer(corroboration, input.manufacturer) ||
      /sherwin-williams|benjaminmoore|behr\.com|ppgpaints/i.test(
        input.sourceUrl,
      ))
  );
}

export function trustedProductImageContext(
  input: OfficialProductTrustInput,
): boolean {
  if (!officialProductContextTrusted(input)) return false;
  if (!input.imageUrl) return false;
  if (!isKnownPaintCanPackshotUrl(input.imageUrl)) return false;

  return imageUrlCorroboratesProduct(
    input.imageUrl,
    input.paintType,
    input.manufacturer,
  );
}

export function scorePaintCanImageCandidate(
  url: string,
  context?: { paintType?: string; manufacturer?: string; altText?: string },
): number {
  if (isRejectableGenericImageUrl(url)) return -100;

  let score = 0;

  if (/sherwin\.scene7\.com\/is\/image\/sw\//i.test(url)) score += 22;
  if (isSherwinPromoPackshotUrl(url)) score += 24;
  if (isKnownPaintCanPackshotUrl(url)) score += 14;
  if (COLLATERAL_IMAGE_URL_MARKERS.test(url)) score -= 50;
  if (/\.(?:png|jpe?g|webp)(?:\?|$)/i.test(url)) score += 4;
  if (PRODUCT_IMAGE_URL_MARKERS.test(url)) score += 8;
  if (/scene7\.com/i.test(url) && !GENERIC_SCENE7_ASSETS.test(url)) score += 3;

  if (context?.paintType) {
    if (imageUrlCorroboratesProduct(url, context.paintType, context.manufacturer)) {
      score += 16;
    } else if (textCorroboratesProductLine(url, context.paintType)) {
      score += 2;
    }
  }

  if (context?.altText) {
    if (isBrochureLikeAltText(context.altText)) {
      score -= 40;
    } else if (PAINT_CAN_POSITIVE_ALT_MARKERS.test(context.altText)) {
      score += 12;
    }

    if (context.paintType) {
      if (textCorroboratesProductLine(context.altText, context.paintType)) {
        score += 15;
      }
      if (
        context.manufacturer &&
        textCorroboratesManufacturer(context.altText, context.manufacturer)
      ) {
        score += 4;
      }
    }
  }

  return score;
}
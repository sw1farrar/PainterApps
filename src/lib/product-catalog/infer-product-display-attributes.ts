import type { ProductCapabilityFlags } from "@/lib/product-catalog/product-attribute-display";
import {
  parseProductUses,
  parseSubstrates,
} from "@/lib/product-catalog/product-attributes";
import type {
  PaintProductApplication,
  PaintProductCategory,
  PaintProductRow,
  PaintProductUse,
  PaintSubstrate,
} from "@/lib/product-catalog/types";

type DisplayAttributeSource = Pick<
  PaintProductRow,
  | "application_type"
  | "category"
  | "product_description"
  | "paint_system_features"
  | "paint_system_feature_options"
  | "recommended_uses"
  | "product_uses"
  | "substrates"
  | "is_self_priming"
  | "is_stain_blocking"
  | "is_mold_mildew_resistant"
  | "is_scrubbable"
  | "is_one_coat"
>;

export type ResolvedDisplayAttributes = {
  productUses: PaintProductUse[];
  substrates: PaintSubstrate[];
  capabilityFlags: ProductCapabilityFlags;
};

const USE_TEXT_PATTERNS: Array<{ pattern: RegExp; use: PaintProductUse }> = [
  { pattern: /\b(?:walls?|wall surfaces?)\b/i, use: "walls" },
  { pattern: /\bceiling/i, use: "ceilings" },
  { pattern: /\btrim\b/i, use: "trim" },
  { pattern: /\bdoors?\b/i, use: "doors" },
  { pattern: /\bcabinet/i, use: "cabinets" },
  { pattern: /\bfurniture\b/i, use: "furniture" },
  { pattern: /\bmasonry\b/i, use: "masonry" },
  { pattern: /\bstucco\b/i, use: "stucco" },
  { pattern: /\bsiding\b/i, use: "siding" },
  { pattern: /\bdecks?\b/i, use: "decks" },
  { pattern: /\bfloors?\b/i, use: "floors" },
  { pattern: /\bmetal\b/i, use: "metal" },
  { pattern: /\bconcrete\b/i, use: "concrete" },
  { pattern: /\b(?:multi[- ]?surface|all surfaces)\b/i, use: "multi_surface" },
];

const SUBSTRATE_TEXT_PATTERNS: Array<{
  pattern: RegExp;
  substrate: PaintSubstrate;
}> = [
  { pattern: /\bdrywall\b/i, substrate: "drywall" },
  { pattern: /\bplaster\b/i, substrate: "plaster" },
  { pattern: /\bwood\b/i, substrate: "wood" },
  { pattern: /\bhardboard\b/i, substrate: "hardboard" },
  { pattern: /\bmdf\b/i, substrate: "mdf" },
  { pattern: /\bgalvanized\b/i, substrate: "galvanized_metal" },
  { pattern: /\bmasonry\b/i, substrate: "masonry" },
  { pattern: /\bbrick\b/i, substrate: "brick" },
  { pattern: /\bconcrete\b/i, substrate: "concrete" },
  { pattern: /\bstucco\b/i, substrate: "stucco" },
  {
    pattern: /\bpreviously painted\b/i,
    substrate: "previously_painted",
  },
  { pattern: /\brepaint/i, substrate: "previously_painted" },
  { pattern: /\bvinyl siding\b/i, substrate: "vinyl_siding" },
  { pattern: /\bfiber cement\b/i, substrate: "fiber_cement" },
  { pattern: /\bcabinet/i, substrate: "cabinets" },
  { pattern: /\bmetal\b/i, substrate: "metal" },
];

function unique<T extends string>(items: T[]): T[] {
  return [...new Set(items)];
}

function collectTextSources(product: DisplayAttributeSource): string[] {
  const sources: string[] = [];

  if (product.product_description?.trim()) {
    sources.push(product.product_description.trim());
  }

  for (const items of [
    product.paint_system_features,
    product.paint_system_feature_options,
    product.recommended_uses,
  ]) {
    for (const item of items) {
      if (item.trim()) sources.push(item.trim());
    }
  }

  return sources;
}

function hasEnrichedFeatureText(product: DisplayAttributeSource): boolean {
  return (
    product.paint_system_features.length > 0 ||
    product.paint_system_feature_options.length > 0
  );
}

function inferUsesFromText(sources: string[]): PaintProductUse[] {
  const uses: PaintProductUse[] = [];
  const corpus = sources.join("\n");

  for (const source of sources) {
    uses.push(...parseProductUses(source));
    for (const part of source.split(/[,;/|]/)) {
      uses.push(...parseProductUses(part));
    }
  }

  for (const { pattern, use } of USE_TEXT_PATTERNS) {
    if (pattern.test(corpus)) uses.push(use);
  }

  return unique(uses);
}

function inferSubstratesFromText(sources: string[]): PaintSubstrate[] {
  const substrates: PaintSubstrate[] = [];
  const corpus = sources.join("\n");

  for (const source of sources) {
    substrates.push(...parseSubstrates(source));
    for (const part of source.split(/[,;/|]/)) {
      substrates.push(...parseSubstrates(part));
    }
  }

  for (const { pattern, substrate } of SUBSTRATE_TEXT_PATTERNS) {
    if (pattern.test(corpus)) substrates.push(substrate);
  }

  return unique(substrates);
}

function defaultUsesForScope(
  applicationType: PaintProductApplication,
  category: PaintProductCategory,
): PaintProductUse[] {
  if (
    category !== "paint" &&
    category !== "primer" &&
    category !== "sealer" &&
    category !== "undercoater"
  ) {
    return [];
  }

  if (applicationType === "exterior") {
    return ["siding", "masonry", "stucco", "trim", "doors"];
  }
  if (applicationType === "interior") {
    return ["walls", "ceilings", "trim", "doors"];
  }
  return ["walls", "siding", "trim", "doors", "masonry"];
}

function defaultSubstratesForScope(
  applicationType: PaintProductApplication,
): PaintSubstrate[] {
  if (applicationType === "exterior") {
    return [
      "wood",
      "fiber_cement",
      "vinyl_siding",
      "masonry",
      "stucco",
      "previously_painted",
    ];
  }
  if (applicationType === "interior") {
    return ["drywall", "plaster", "wood", "previously_painted"];
  }
  return ["drywall", "wood", "masonry", "previously_painted"];
}

export function inferCapabilityFlags(
  product: DisplayAttributeSource,
  corpus: string,
): ProductCapabilityFlags {
  const featureText = [
    ...product.paint_system_features,
    ...product.paint_system_feature_options,
  ].join(" ");
  const fullText = `${corpus}\n${featureText}`.toLowerCase();

  return {
    isSelfPriming:
      product.is_self_priming || /self[-\s]?prim/i.test(fullText),
    isStainBlocking:
      product.is_stain_blocking ||
      /stain[-\s]?block|tannin bleed/i.test(fullText),
    isMoldMildewResistant:
      product.is_mold_mildew_resistant || /\bmildew\b|\bmold\b/i.test(fullText),
    isScrubbable: product.is_scrubbable || /\bscrub/i.test(fullText),
    isOneCoat: product.is_one_coat || /one[-\s]?coat/i.test(fullText),
  };
}

export function resolveDisplayAttributes(
  product: DisplayAttributeSource,
): ResolvedDisplayAttributes {
  const sources = collectTextSources(product);
  const corpus = sources.join("\n").toLowerCase();
  const capabilityFlags = inferCapabilityFlags(product, corpus);

  let productUses = product.product_uses;
  if (productUses.length === 0) {
    productUses = inferUsesFromText(sources);
    if (productUses.length === 0 && hasEnrichedFeatureText(product)) {
      productUses = defaultUsesForScope(
        product.application_type,
        product.category,
      );
    }
  }

  let substrates = product.substrates;
  if (substrates.length === 0) {
    substrates = inferSubstratesFromText(sources);
    if (substrates.length === 0 && hasEnrichedFeatureText(product)) {
      substrates = defaultSubstratesForScope(product.application_type);
    }
  }

  return {
    productUses,
    substrates,
    capabilityFlags,
  };
}
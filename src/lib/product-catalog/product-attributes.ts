import { parseStringArray } from "@/lib/product-catalog/enrichment-status";
import type {
  PaintProductApplication,
  PaintProductBase,
  PaintProductCategory,
  PaintProductRow,
  PaintProductUse,
  PaintResinSystem,
  PaintSheen,
  PaintSubstrate,
  PaintVocLevel,
} from "@/lib/product-catalog/types";

export type ProductAttributeFields = {
  applicationType: PaintProductApplication;
  category: PaintProductCategory;
  baseType: PaintProductBase;
  resinType: string | null;
  resinSystem: PaintResinSystem;
  sheenOptions: string[];
  sheens: PaintSheen[];
  productUses: PaintProductUse[];
  substrates: PaintSubstrate[];
  vocLevel: PaintVocLevel;
  isSelfPriming: boolean;
  isStainBlocking: boolean;
  isMoldMildewResistant: boolean;
  isScrubbable: boolean;
  isOneCoat: boolean;
  recommendedUses: string[];
  volumeSolidsPct: number | null;
  volumeSolidsLabel: string | null;
  attributeSourceUrl: string | null;
};

const APPLICATION_ALIASES: Record<string, PaintProductApplication> = {
  interior: "interior",
  int: "interior",
  inside: "interior",
  exterior: "exterior",
  ext: "exterior",
  outside: "exterior",
  both: "both",
  interior_exterior: "both",
  "interior/exterior": "both",
  "interior & exterior": "both",
  "interior and exterior": "both",
  "indoor/outdoor": "both",
  indoor_outdoor: "both",
  "indoor outdoor": "both",
};

const CATEGORY_ALIASES: Record<string, PaintProductCategory> = {
  paint: "paint",
  primer: "primer",
  sealer: "sealer",
  undercoater: "undercoater",
  "primer sealer": "primer",
  "primer/sealer": "primer",
};

const RESIN_SYSTEM_ALIASES: Record<string, PaintResinSystem> = {
  acrylic: "acrylic",
  "100% acrylic": "100_percent_acrylic",
  "100 percent acrylic": "100_percent_acrylic",
  "100_percent_acrylic": "100_percent_acrylic",
  "vinyl acrylic": "vinyl_acrylic",
  vinyl_acrylic: "vinyl_acrylic",
  alkyd: "alkyd",
  "alkyd modified": "alkyd_modified",
  "modified alkyd": "alkyd_modified",
  alkyd_modified: "alkyd_modified",
  "urethane modified acrylic": "urethane_modified_acrylic",
  "urethane-modified acrylic": "urethane_modified_acrylic",
  urethane_modified_acrylic: "urethane_modified_acrylic",
  "urethane alkyd": "urethane_alkyd",
  urethane_alkyd: "urethane_alkyd",
  polyurethane: "polyurethane",
  epoxy: "epoxy",
  silicone: "silicone",
  latex: "latex",
  oil: "oil",
  unknown: "unknown",
};

const SHEEN_ALIASES: Record<string, PaintSheen> = {
  ultra_flat: "ultra_flat",
  "ultra flat": "ultra_flat",
  flat: "flat",
  matte: "matte",
  eggshell: "eggshell",
  satin: "satin",
  pearl: "pearl",
  semi_gloss: "semi_gloss",
  "semi-gloss": "semi_gloss",
  "semi gloss": "semi_gloss",
  gloss: "gloss",
  high_gloss: "high_gloss",
  "high-gloss": "high_gloss",
  "high gloss": "high_gloss",
  soft_gloss: "soft_gloss",
  "soft gloss": "soft_gloss",
  low_sheen: "low_sheen",
  "low sheen": "low_sheen",
};

const PRODUCT_USE_ALIASES: Record<string, PaintProductUse> = {
  walls: "walls",
  wall: "walls",
  ceilings: "ceilings",
  ceiling: "ceilings",
  trim: "trim",
  doors: "doors",
  door: "doors",
  cabinets: "cabinets",
  cabinet: "cabinets",
  furniture: "furniture",
  masonry: "masonry",
  stucco: "stucco",
  siding: "siding",
  decks: "decks",
  deck: "decks",
  floors: "floors",
  floor: "floors",
  metal: "metal",
  concrete: "concrete",
  multi_surface: "multi_surface",
  "multi-surface": "multi_surface",
  "multi surface": "multi_surface",
};

const SUBSTRATE_ALIASES: Record<string, PaintSubstrate> = {
  drywall: "drywall",
  plaster: "plaster",
  wood: "wood",
  hardboard: "hardboard",
  mdf: "mdf",
  metal: "metal",
  galvanized_metal: "galvanized_metal",
  galvanized: "galvanized_metal",
  masonry: "masonry",
  brick: "brick",
  concrete: "concrete",
  stucco: "stucco",
  previously_painted: "previously_painted",
  "previously painted": "previously_painted",
  vinyl_siding: "vinyl_siding",
  "vinyl siding": "vinyl_siding",
  fiber_cement: "fiber_cement",
  "fiber cement": "fiber_cement",
  cabinets: "cabinets",
};

const VOC_ALIASES: Record<string, PaintVocLevel> = {
  zero: "zero",
  "zero voc": "zero",
  "0 voc": "zero",
  low: "low",
  "low voc": "low",
  standard: "standard",
  unknown: "unknown",
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseEnumValue<T extends string>(
  value: unknown,
  aliases: Record<string, T>,
  fallback: T,
): T {
  if (typeof value !== "string") return fallback;
  const key = normalizeToken(value);
  return aliases[key] ?? fallback;
}

function parseEnumList<T extends string>(
  value: unknown,
  aliases: Record<string, T>,
): T[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;/|]/)
      : [];

  const seen = new Set<T>();
  const result: T[] = [];

  for (const entry of rawValues) {
    if (typeof entry !== "string") continue;
    const key = normalizeToken(entry);
    const mapped = aliases[key];
    if (!mapped || seen.has(mapped)) continue;
    seen.add(mapped);
    result.push(mapped);
  }

  return result;
}

export function parseApplicationType(
  value: unknown,
  fallback: PaintProductApplication = "interior",
): PaintProductApplication {
  return parseEnumValue(value, APPLICATION_ALIASES, fallback);
}

export function parseCategory(
  value: unknown,
  fallback: PaintProductCategory = "paint",
): PaintProductCategory {
  return parseEnumValue(value, CATEGORY_ALIASES, fallback);
}

export function normalizeBaseType(value: unknown): PaintProductBase {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();
  if (
    normalized.includes("water") ||
    normalized.includes("latex") ||
    normalized.includes("acrylic emulsion")
  ) {
    return "water";
  }
  if (
    normalized.includes("solvent") ||
    normalized.includes("mineral spirit")
  ) {
    return "solvent";
  }
  if (
    normalized.includes("oil") ||
    normalized.includes("alkyd") ||
    normalized.includes("enamel")
  ) {
    return "oil";
  }
  return "unknown";
}

export function parseResinSystem(value: unknown): PaintResinSystem {
  if (typeof value === "string") {
    const key = normalizeToken(value);
    if (RESIN_SYSTEM_ALIASES[key]) return RESIN_SYSTEM_ALIASES[key]!;
  }
  return "unknown";
}

export function inferResinSystemFromLabel(
  resinType: string | null | undefined,
): PaintResinSystem {
  if (!resinType?.trim()) return "unknown";
  const key = normalizeToken(resinType);
  if (RESIN_SYSTEM_ALIASES[key]) return RESIN_SYSTEM_ALIASES[key]!;
  if (key.includes("urethane") && key.includes("acrylic")) {
    return "urethane_modified_acrylic";
  }
  if (key.includes("urethane") && key.includes("alkyd")) {
    return "urethane_alkyd";
  }
  if (key.includes("alkyd") && key.includes("modif")) {
    return "alkyd_modified";
  }
  if (key.includes("100") && key.includes("acrylic")) {
    return "100_percent_acrylic";
  }
  if (key.includes("vinyl") && key.includes("acrylic")) {
    return "vinyl_acrylic";
  }
  if (key.includes("acrylic")) return "acrylic";
  if (key.includes("alkyd")) return "alkyd";
  if (key.includes("epoxy")) return "epoxy";
  if (key.includes("polyurethane")) return "polyurethane";
  if (key.includes("latex")) return "latex";
  return "unknown";
}

export function parseSheens(value: unknown): PaintSheen[] {
  return parseEnumList(value, SHEEN_ALIASES);
}

export function parseProductUses(value: unknown): PaintProductUse[] {
  return parseEnumList(value, PRODUCT_USE_ALIASES);
}

export function parseSubstrates(value: unknown): PaintSubstrate[] {
  return parseEnumList(value, SUBSTRATE_ALIASES);
}

export function parseVocLevel(value: unknown): PaintVocLevel {
  return parseEnumValue(value, VOC_ALIASES, "unknown");
}

export function parseVolumeSolidsPct(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    const rangeMatch = normalized.match(
      /(\d+(?:\.\d+)?)\s*(?:%|percent)?\s*(?:-|to)\s*(\d+(?:\.\d+)?)/,
    );
    if (rangeMatch) {
      const low = Number(rangeMatch[1]);
      const high = Number(rangeMatch[2]);
      if (Number.isFinite(low) && Number.isFinite(high)) {
        return Math.round(((low + high) / 2) * 100) / 100;
      }
    }

    const singleMatch = normalized.match(/(\d+(?:\.\d+)?)/);
    if (singleMatch) {
      const parsed = Number(singleMatch[1]);
      if (Number.isFinite(parsed)) {
        return Math.min(100, Math.max(0, Math.round(parsed * 100) / 100));
      }
    }
  }

  return null;
}

export function parseVolumeSolidsLabel(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim();
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "yes", "y", "1"].includes(normalized);
  }
  return false;
}

export function parseProductAttributesFromPayload(
  payload: Record<string, unknown>,
  defaults?: Partial<ProductAttributeFields>,
): ProductAttributeFields {
  const sheenOptions = parseStringArray(payload.sheenOptions);
  const resinType =
    typeof payload.resinType === "string" && payload.resinType.trim()
      ? payload.resinType.trim()
      : (defaults?.resinType ?? null);
  const resinSystem = parseResinSystem(payload.resinSystem);
  const inferredResinSystem =
    resinSystem === "unknown"
      ? inferResinSystemFromLabel(resinType)
      : resinSystem;

  const sheensFromPayload = parseSheens(payload.sheens);
  const sheens =
    sheensFromPayload.length > 0
      ? sheensFromPayload
      : parseSheens(sheenOptions);

  return {
    applicationType: parseApplicationType(
      payload.applicationType,
      defaults?.applicationType ?? "interior",
    ),
    category: parseCategory(payload.category, defaults?.category ?? "paint"),
    baseType: normalizeBaseType(payload.baseType ?? defaults?.baseType),
    resinType,
    resinSystem: inferredResinSystem,
    sheenOptions:
      sheenOptions.length > 0 ? sheenOptions : (defaults?.sheenOptions ?? []),
    sheens: sheens.length > 0 ? sheens : (defaults?.sheens ?? []),
    productUses: parseProductUses(payload.productUses),
    substrates: parseSubstrates(payload.substrates),
    vocLevel: parseVocLevel(payload.vocLevel),
    isSelfPriming: parseBoolean(payload.isSelfPriming),
    isStainBlocking: parseBoolean(payload.isStainBlocking),
    isMoldMildewResistant: parseBoolean(payload.isMoldMildewResistant),
    isScrubbable: parseBoolean(payload.isScrubbable),
    isOneCoat: parseBoolean(payload.isOneCoat),
    recommendedUses: parseStringArray(payload.recommendedUses),
    volumeSolidsPct:
      parseVolumeSolidsPct(payload.volumeSolidsPct ?? payload.volumeSolids) ??
      defaults?.volumeSolidsPct ??
      null,
    volumeSolidsLabel:
      parseVolumeSolidsLabel(payload.volumeSolidsLabel) ??
      defaults?.volumeSolidsLabel ??
      null,
    attributeSourceUrl:
      typeof payload.attributeSourceUrl === "string" &&
      payload.attributeSourceUrl.trim()
        ? payload.attributeSourceUrl.trim()
        : typeof payload.sourceUrl === "string" && payload.sourceUrl.trim()
          ? payload.sourceUrl.trim()
          : (defaults?.attributeSourceUrl ?? null),
  };
}

export function canLookupApplicationType(
  value: PaintProductApplication,
): "interior" | "exterior" {
  return value === "exterior" ? "exterior" : "interior";
}

/** Paint-can search order for interior/exterior and dual-scope products. */
export function canLookupApplicationTypes(
  value: PaintProductApplication,
): Array<"interior" | "exterior"> {
  if (value === "both") return ["interior", "exterior"];
  return [canLookupApplicationType(value)];
}

const APPLICATION_SCOPE_BOTH_MARKERS = [
  /\binterior\s*(?:\/|&|and)\s*exterior\b/i,
  /\bindoor\s*(?:\/|&|and)\s*outdoor\b/i,
  /\binterior\s+or\s+exterior\s+use\b/i,
  /\binterior\s+and\s+exterior\s+use\b/i,
  /\bint\s*\/\s*ext\b/i,
];

const APPLICATION_SCOPE_INTERIOR_ONLY_MARKERS = [
  /\bfor interior use only\b/i,
  /\binterior use only\b/i,
  /\binterior[-\s]?only\b/i,
  /\bfor interior applications?\b/i,
  /\brecommended for interior\b/i,
  /\bnot (?:for |recommended (?:for |on ))exterior\b/i,
  /\bdo not use (?:on )?exterior\b/i,
  /\bnot recommended for exterior\b/i,
];

const APPLICATION_SCOPE_EXTERIOR_ONLY_MARKERS = [
  /\bfor exterior use only\b/i,
  /\bexterior use only\b/i,
  /\bexterior[-\s]?only\b/i,
  /\bfor exterior applications?\b/i,
  /\brecommended for exterior\b/i,
  /\bnot (?:for |recommended (?:for |on ))interior\b/i,
  /\bdo not use (?:on )?interior\b/i,
  /\bnot recommended for interior\b/i,
];

function payloadLiteratureValue(
  payload: Record<string, unknown>,
  key: string,
): string | string[] | null {
  const value = payload[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return null;
}

function literatureTextFromParts(
  parts: Array<string | string[] | null | undefined>,
): string {
  const chunks: string[] = [];

  for (const part of parts) {
    if (Array.isArray(part)) {
      chunks.push(...part.filter((entry) => typeof entry === "string"));
      continue;
    }
    if (typeof part === "string" && part.trim()) {
      chunks.push(part.trim());
    }
  }

  return chunks.join("\n");
}

/** Resolve interior/exterior/both from TDS/PDS wording — not product marketing names. */
export function resolveApplicationScopeFromLiterature(
  text: string,
): PaintProductApplication | null {
  const normalized = text.trim();
  if (!normalized) return null;

  const hasBothMarker = APPLICATION_SCOPE_BOTH_MARKERS.some((pattern) =>
    pattern.test(normalized),
  );
  const hasInteriorOnly = APPLICATION_SCOPE_INTERIOR_ONLY_MARKERS.some(
    (pattern) => pattern.test(normalized),
  );
  const hasExteriorOnly = APPLICATION_SCOPE_EXTERIOR_ONLY_MARKERS.some(
    (pattern) => pattern.test(normalized),
  );

  if (hasBothMarker && !hasInteriorOnly && !hasExteriorOnly) {
    return "both";
  }
  if (hasInteriorOnly && !hasExteriorOnly) {
    return "interior";
  }
  if (hasExteriorOnly && !hasInteriorOnly) {
    return "exterior";
  }

  const mentionsInterior = /\binterior\b/i.test(normalized);
  const mentionsExterior = /\bexterior\b/i.test(normalized);

  if (mentionsInterior && !mentionsExterior) {
    return "interior";
  }
  if (mentionsExterior && !mentionsInterior) {
    return "exterior";
  }

  return null;
}

export function resolveApplicationTypeFromDataSheetPayload(
  payload: Record<string, unknown>,
  fallback: PaintProductApplication = "interior",
): PaintProductApplication {
  const literatureText = literatureTextFromParts([
    payloadLiteratureValue(payload, "applicationTypeEvidence"),
    payloadLiteratureValue(payload, "application_type_evidence"),
    payloadLiteratureValue(payload, "limitations"),
    payloadLiteratureValue(payload, "useInstructions"),
    payloadLiteratureValue(payload, "use_instructions"),
    payloadLiteratureValue(payload, "recommendedUses"),
    payloadLiteratureValue(payload, "recommended_uses"),
    payloadLiteratureValue(payload, "productDescription"),
  ]);

  const fromLiterature = resolveApplicationScopeFromLiterature(literatureText);
  if (fromLiterature) {
    return fromLiterature;
  }

  const evidenceText = literatureTextFromParts([
    payloadLiteratureValue(payload, "applicationTypeEvidence"),
    payloadLiteratureValue(payload, "application_type_evidence"),
  ]);
  const fromEvidence = resolveApplicationScopeFromLiterature(evidenceText);
  if (fromEvidence) {
    return fromEvidence;
  }

  return parseApplicationType(payload.applicationType, fallback);
}

/** @deprecated Prefer resolveApplicationScopeFromLiterature on TDS text only. */
export function inferApplicationTypeFromText(
  ...parts: Array<string | null | undefined>
): PaintProductApplication | null {
  return resolveApplicationScopeFromLiterature(
    literatureTextFromParts(parts),
  );
}

export function mergeApplicationScope(
  left: PaintProductApplication,
  right: PaintProductApplication,
): PaintProductApplication {
  if (left === "both" || right === "both") return "both";
  if (left !== right) return "both";
  return left;
}

export function productAttributesToDbPayload(
  attributes: ProductAttributeFields,
): Pick<
  PaintProductRow,
  | "application_type"
  | "category"
  | "base_type"
  | "resin_type"
  | "resin_system"
  | "sheen_options"
  | "sheens"
  | "product_uses"
  | "substrates"
  | "voc_level"
  | "is_self_priming"
  | "is_stain_blocking"
  | "is_mold_mildew_resistant"
  | "is_scrubbable"
  | "is_one_coat"
  | "recommended_uses"
  | "volume_solids_pct"
  | "volume_solids_label"
  | "attribute_source_url"
> {
  return {
    application_type: attributes.applicationType,
    category: attributes.category,
    base_type: attributes.baseType,
    resin_type: attributes.resinType,
    resin_system: attributes.resinSystem,
    sheen_options: attributes.sheenOptions,
    sheens: attributes.sheens,
    product_uses: attributes.productUses,
    substrates: attributes.substrates,
    voc_level: attributes.vocLevel,
    is_self_priming: attributes.isSelfPriming,
    is_stain_blocking: attributes.isStainBlocking,
    is_mold_mildew_resistant: attributes.isMoldMildewResistant,
    is_scrubbable: attributes.isScrubbable,
    is_one_coat: attributes.isOneCoat,
    recommended_uses: attributes.recommendedUses,
    volume_solids_pct: attributes.volumeSolidsPct,
    volume_solids_label: attributes.volumeSolidsLabel,
    attribute_source_url: attributes.attributeSourceUrl,
  };
}

export function discoveredProductToDbPayload(
  product: import("@/lib/product-catalog/types").DiscoveredPaintProduct,
): Pick<
  PaintProductRow,
  | "application_type"
  | "category"
  | "base_type"
  | "resin_type"
  | "resin_system"
  | "sheen_options"
  | "sheens"
  | "product_uses"
  | "substrates"
  | "voc_level"
  | "is_self_priming"
  | "is_stain_blocking"
  | "is_mold_mildew_resistant"
  | "is_scrubbable"
  | "is_one_coat"
  | "recommended_uses"
  | "volume_solids_pct"
  | "volume_solids_label"
  | "attribute_source_url"
> {
  return productAttributesToDbPayload({
    applicationType: product.applicationType,
    category: product.category,
    baseType: product.baseType,
    resinType: product.resinType,
    resinSystem: product.resinSystem,
    sheenOptions: product.sheenOptions,
    sheens: product.sheens,
    productUses: product.productUses,
    substrates: product.substrates,
    vocLevel: product.vocLevel,
    isSelfPriming: product.isSelfPriming,
    isStainBlocking: product.isStainBlocking,
    isMoldMildewResistant: product.isMoldMildewResistant,
    isScrubbable: product.isScrubbable,
    isOneCoat: product.isOneCoat,
    recommendedUses: product.recommendedUses,
    volumeSolidsPct: product.volumeSolidsPct,
    volumeSolidsLabel: product.volumeSolidsLabel,
    attributeSourceUrl: product.attributeSourceUrl,
  });
}

export function buildDiscoveredPaintProduct(
  raw: Record<string, unknown>,
  defaults: Partial<ProductAttributeFields> & { name: string },
): import("@/lib/product-catalog/types").DiscoveredPaintProduct | null {
  if (!defaults.name.trim()) return null;

  const attributes = parseProductAttributesFromPayload(raw, defaults);
  const name = defaults.name.trim();

  return {
    key: `${attributes.applicationType}:${attributes.category}:${name.toLowerCase()}`,
    name,
    applicationType: attributes.applicationType,
    category: attributes.category,
    resinType: attributes.resinType,
    resinSystem: attributes.resinSystem,
    baseType: attributes.baseType,
    sheenOptions: attributes.sheenOptions,
    sheens: attributes.sheens,
    productUses: attributes.productUses,
    substrates: attributes.substrates,
    vocLevel: attributes.vocLevel,
    isSelfPriming: attributes.isSelfPriming,
    isStainBlocking: attributes.isStainBlocking,
    isMoldMildewResistant: attributes.isMoldMildewResistant,
    isScrubbable: attributes.isScrubbable,
    isOneCoat: attributes.isOneCoat,
    recommendedUses: attributes.recommendedUses,
    volumeSolidsPct: attributes.volumeSolidsPct,
    volumeSolidsLabel: attributes.volumeSolidsLabel,
    sourceUrl: attributes.attributeSourceUrl,
    attributeSourceUrl: attributes.attributeSourceUrl,
  };
}

export const APPLICATION_TYPE_PROMPT_GUIDANCE = [
  "- applicationType: interior | exterior | both",
  "  MUST match the Recommended Use, Limitations, and Application sections of the TDS/PDS — not the product name alone.",
  "  Use interior when the document limits use to interior/indoor environments (e.g. 'for interior use', 'interior only').",
  "  Use exterior when the document limits use to exterior/outdoor environments.",
  "  Use both ONLY when the document explicitly allows interior AND exterior (or indoor AND outdoor) use in the same product literature.",
  "- applicationTypeEvidence: verbatim quote from the TDS/PDS that proves the applicationType (required).",
  "- limitations: verbatim or tight paraphrase of limitation / not-for-use statements from the data sheet (string or null).",
].join("\n");

export const PRODUCT_DISCOVERY_APPLICATION_GUIDANCE = [
  "- applicationType: interior | exterior | both",
  "  Read ONLY the product page Recommended Use / Application / Limitations text — not the marketing product name alone.",
  "  Use both ONLY when the page explicitly authorizes interior AND exterior (or indoor AND outdoor) use.",
  "  If unclear, prefer interior or exterior based on the page wording — do not default to both.",
].join("\n");

/** Website discovery — identity only; TDS enrichment refines attributes later. */
export const PRODUCT_DISCOVERY_IDENTITY_PROMPT_SCHEMA = [
  "- name: exact official product line name from the product page title or H1",
  PRODUCT_DISCOVERY_APPLICATION_GUIDANCE,
  "- category: paint | primer | sealer | undercoater",
  "- sourceUrl: official manufacturer product page URL (when available)",
].join("\n");

export const PRODUCT_ATTRIBUTE_PROMPT_SCHEMA = [
  APPLICATION_TYPE_PROMPT_GUIDANCE,
  "- category: paint, primer, sealer, or undercoater",
  "- baseType: water, oil, solvent, or unknown",
  "- resinType: manufacturer wording (e.g. Urethane-Modified Acrylic)",
  "- resinSystem: acrylic | 100_percent_acrylic | vinyl_acrylic | alkyd | alkyd_modified | urethane_modified_acrylic | urethane_alkyd | polyurethane | epoxy | silicone | latex | oil | unknown",
  "- sheenOptions: manufacturer sheen labels as listed",
  "- sheens: normalized sheen slugs from [ultra_flat, flat, matte, eggshell, satin, pearl, semi_gloss, gloss, high_gloss, soft_gloss, low_sheen]",
  "- productUses: from [walls, ceilings, trim, doors, cabinets, furniture, masonry, stucco, siding, decks, floors, metal, concrete, multi_surface]",
  "- substrates: from [drywall, plaster, wood, hardboard, mdf, metal, galvanized_metal, masonry, brick, concrete, stucco, previously_painted, vinyl_siding, fiber_cement, cabinets]",
  "- vocLevel: zero | low | standard | unknown",
  "- volumeSolidsPct: numeric percent 0-100 from TDS (use midpoint if a range is given)",
  "- volumeSolidsLabel: manufacturer wording for volume solids (e.g. 40 ± 2)",
  "- isSelfPriming, isStainBlocking, isMoldMildewResistant, isScrubbable, isOneCoat: boolean",
  "- recommendedUses: extra manufacturer use phrases as strings",
  "- dataSheetUrl: URL of the Technical Data Sheet (TDS) or Product Data Sheet used",
  "- sourceUrl / attributeSourceUrl: must match the data sheet URL",
].join("\n");
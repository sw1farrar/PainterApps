import { createXaiResponse } from "@/lib/xai/responses";
import {
  parseProductAttributesFromPayload,
  PRODUCT_ATTRIBUTE_PROMPT_SCHEMA,
  type ProductAttributeFields,
} from "@/lib/product-catalog/product-attributes";
import type { PaintProductApplication } from "@/lib/product-catalog/types";
import { resolveManufacturerAllowedDomains } from "@/lib/sell-sheet/paint-can-ai";
import { preparePaintSystemFeatures } from "@/lib/sell-sheet/paint-system-features";
import { PAINT_SYSTEM_OPTIONS_MAX } from "@/lib/sell-sheet/sell-sheet-limits";
import type { SaveCustomPaintProductInput } from "@/lib/paint-library/custom-product-form";
import type { CompanyPaintProductRole } from "@/types/database";

export type CustomProductDatasheetEnrichment = {
  sourceUrl: string | null;
  productDescription: string | null;
  paintSystemFeatures: string[];
  paintSystemFeatureOptions: string[];
  attributes: ProductAttributeFields;
};

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

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function categoryToRole(category: string): CompanyPaintProductRole {
  if (category === "primer" || category === "undercoater") return "primer";
  if (category === "sealer") return "sealer";
  return "topcoat";
}

export function mapDatasheetEnrichmentToSaveInput(
  enrichment: CustomProductDatasheetEnrichment,
  input: {
    manufacturerName: string;
    productName: string;
  },
): Partial<SaveCustomPaintProductInput> {
  const { attributes } = enrichment;

  return {
    name: input.productName,
    manufacturerName: input.manufacturerName,
    role: categoryToRole(attributes.category),
    applicationType: attributes.applicationType,
    baseType: attributes.baseType,
    resinType: attributes.resinType,
    resinSystem: attributes.resinSystem,
    sourceUrl: enrichment.sourceUrl,
    productDescription: enrichment.productDescription,
    sheenOptions: attributes.sheenOptions,
    sheen: attributes.sheenOptions[0] ?? null,
    paintSystemFeatures: enrichment.paintSystemFeatures,
    paintSystemFeatureOptions: enrichment.paintSystemFeatureOptions,
    recommendedUses: attributes.recommendedUses,
    productUses: attributes.productUses,
    substrates: attributes.substrates,
    vocLevel: attributes.vocLevel,
    volumeSolidsPct: attributes.volumeSolidsPct,
    volumeSolidsLabel: attributes.volumeSolidsLabel,
    isSelfPriming: attributes.isSelfPriming,
    isStainBlocking: attributes.isStainBlocking,
    isMoldMildewResistant: attributes.isMoldMildewResistant,
    isScrubbable: attributes.isScrubbable,
    isOneCoat: attributes.isOneCoat,
  };
}

export async function enrichCustomProductFromDataSheet(input: {
  manufacturerName: string;
  productName: string;
  scopeHint?: PaintProductApplication;
}): Promise<
  | { success: true; data: CustomProductDatasheetEnrichment }
  | { success: false; error: string }
> {
  const manufacturerName = input.manufacturerName.trim();
  const productName = input.productName.trim();

  if (!manufacturerName || !productName) {
    return {
      success: false,
      error:
        "Enter the manufacturer and product name before running AI lookup.",
    };
  }

  const allowedDomains = resolveManufacturerAllowedDomains(manufacturerName);
  const scopeHint =
    input.scopeHint && input.scopeHint !== "both"
      ? `User scope hint (verify against the TDS/PDS): ${input.scopeHint}`
      : "Infer applicationType (interior, exterior, or both) from the Technical Data Sheet — not from the marketing product name alone.";

  const response = await createXaiResponse({
    instructions: [
      "You enrich company paint product catalog entries from official manufacturer Technical Data Sheets (TDS) and Product Data Sheets (PDS).",
      "Search only the manufacturer's official website — never retailers or third-party sites.",
      "Return ONLY valid JSON. Do not include markdown or commentary.",
      "Capture the full data sheet: coating specs, uses, substrates, VOC, volume solids, resin, sheens, and capability flags.",
      PRODUCT_ATTRIBUTE_PROMPT_SCHEMA,
      "- productDescription: manufacturer product description from the data sheet (string or null)",
      "- paintSystemFeatures: up to 3 short headline coating specs for catalog display",
      "- paintSystemFeatureOptions: comprehensive coating spec bullets from the TDS/PDS",
      "- productPageUrl: official manufacturer product page URL when available",
    ].join("\n"),
    prompt: [
      `Manufacturer: ${manufacturerName}`,
      `Product line: ${productName}`,
      scopeHint,
      "Locate the official product page and technical/product data sheet, then extract every catalog attribute you can verify.",
    ].join("\n"),
    webSearch: allowedDomains.length ? { allowedDomains } : true,
  });

  if (!response.success) {
    return { success: false, error: response.error };
  }

  const json = extractJsonObject(response.text);
  if (!json) {
    return {
      success: false,
      error:
        "Could not parse product data from the manufacturer site. Try a more specific product line name.",
    };
  }

  const attributes = parseProductAttributesFromPayload(json, {
    applicationType: input.scopeHint ?? "both",
    category: "paint",
  });

  const rawFeatures = parseStringArray(
    json.paintSystemFeatureOptions ??
      json.paint_system_feature_options ??
      json.paintSystemFeatures ??
      json.paint_system_features,
  );
  const paintSystemFeatureOptions = preparePaintSystemFeatures(
    rawFeatures,
    PAINT_SYSTEM_OPTIONS_MAX,
  );
  const headlineFeatures = preparePaintSystemFeatures(
    parseStringArray(json.paintSystemFeatures ?? json.paint_system_features),
    3,
  );
  const paintSystemFeatures =
    headlineFeatures.length > 0
      ? headlineFeatures
      : paintSystemFeatureOptions.slice(0, 3);

  const sourceUrl =
    (typeof json.dataSheetUrl === "string" && json.dataSheetUrl.trim()) ||
    (typeof json.attributeSourceUrl === "string" &&
      json.attributeSourceUrl.trim()) ||
    (typeof json.sourceUrl === "string" && json.sourceUrl.trim()) ||
    (typeof json.productPageUrl === "string" && json.productPageUrl.trim()) ||
    response.citations[0]?.trim() ||
    null;

  const productDescription =
    typeof json.productDescription === "string" && json.productDescription.trim()
      ? json.productDescription.trim()
      : typeof json.product_description === "string" &&
          json.product_description.trim()
        ? json.product_description.trim()
        : null;

  if (!sourceUrl && paintSystemFeatureOptions.length === 0) {
    return {
      success: false,
      error:
        "Could not find a technical data sheet for that product on the manufacturer site. Try a more specific product line name.",
    };
  }

  return {
    success: true,
    data: {
      sourceUrl,
      productDescription,
      paintSystemFeatures,
      paintSystemFeatureOptions,
      attributes,
    },
  };
}
import { findPlatformProductMatches } from "@/lib/product-catalog/find-platform-product-matches";
import {
  enrichCustomProductFromDataSheet,
  mapDatasheetEnrichmentToSaveInput,
} from "@/lib/product-catalog/enrich-custom-product-datasheet";
import { formatListInput } from "@/lib/product-catalog/parse-list-input";
import type { PlatformProductMatch } from "@/lib/product-catalog/find-platform-product-matches";
import { resolveCustomProductCanImageFromManufacturer } from "@/lib/product-catalog/resolve-custom-product-can-image";
import type {
  CustomProductFormValues,
  SaveCustomPaintProductInput,
} from "@/lib/paint-library/custom-product-form";
import type { PaintProductApplication } from "@/lib/product-catalog/types";

export type CustomProductAiLookupSuccess = {
  status: "enriched";
  productName: string;
  sourceUrl: string | null;
  suggestedAttributes: Partial<SaveCustomPaintProductInput>;
  canImageUrl: string | null;
  canImagePreviewDataUrl: string | null;
  canImageError: string | null;
};

export type CustomProductAiLookupPlatformMatch = {
  status: "platform_match";
  matches: PlatformProductMatch[];
};

export type CustomProductAiLookupResult =
  | CustomProductAiLookupSuccess
  | CustomProductAiLookupPlatformMatch
  | { status: "error"; error: string };

export async function lookupCustomProductWithAi(input: {
  manufacturerName: string;
  productName: string;
  applicationType: PaintProductApplication;
}): Promise<CustomProductAiLookupResult> {
  const manufacturerName = input.manufacturerName.trim();
  const productName = input.productName.trim();
  if (!manufacturerName || !productName) {
    return {
      status: "error",
      error:
        "Enter the manufacturer and product name before running AI lookup.",
    };
  }

  const platformMatches = await findPlatformProductMatches({
    manufacturerName,
    productName,
    limit: 3,
  });

  if (platformMatches.length > 0) {
    return { status: "platform_match", matches: platformMatches };
  }

  const enrichment = await enrichCustomProductFromDataSheet({
    manufacturerName,
    productName,
    scopeHint: input.applicationType,
  });

  if (!enrichment.success) {
    return { status: "error", error: enrichment.error };
  }

  const suggestedAttributes = mapDatasheetEnrichmentToSaveInput(
    enrichment.data,
    { manufacturerName, productName },
  );

  const canImage = await resolveCustomProductCanImageFromManufacturer({
    manufacturerName,
    productName,
    applicationType: enrichment.data.attributes.applicationType,
    productPageUrl: enrichment.data.sourceUrl,
  });

  return {
    status: "enriched",
    productName,
    sourceUrl: enrichment.data.sourceUrl,
    suggestedAttributes,
    canImageUrl: canImage.success ? canImage.canImageUrl : null,
    canImagePreviewDataUrl: canImage.success ? canImage.previewDataUrl : null,
    canImageError: canImage.success ? null : canImage.error,
  };
}

export function formatSuggestedAttributesForForm(
  suggested: Partial<SaveCustomPaintProductInput>,
): {
  paintSystemFeaturesText: string;
  paintSystemFeatureOptionsText: string;
  sheenOptionsText: string;
  recommendedUsesText: string;
} {
  return {
    paintSystemFeaturesText: formatListInput(suggested.paintSystemFeatures ?? []),
    paintSystemFeatureOptionsText: formatListInput(
      suggested.paintSystemFeatureOptions ?? [],
    ),
    sheenOptionsText: formatListInput(suggested.sheenOptions ?? []),
    recommendedUsesText: formatListInput(
      (suggested.recommendedUses ?? []).map(String),
    ),
  };
}

export function applyAiLookupToCustomForm(
  form: CustomProductFormValues,
  lookup: CustomProductAiLookupSuccess,
  selectedCanImageUrl?: string | null,
): CustomProductFormValues {
  const suggested = lookup.suggestedAttributes;
  const formatted = formatSuggestedAttributesForForm(suggested);

  return {
    ...form,
    name: suggested.name ?? form.name,
    manufacturerName: suggested.manufacturerName ?? form.manufacturerName,
    role: suggested.role ?? form.role,
    applicationType:
      (suggested.applicationType as CustomProductFormValues["applicationType"]) ??
      form.applicationType,
    baseType: suggested.baseType ?? form.baseType,
    resinType: suggested.resinType ?? form.resinType,
    resinSystem: suggested.resinSystem ?? form.resinSystem,
    productDescription: suggested.productDescription ?? form.productDescription,
    sourceUrl: suggested.sourceUrl ?? lookup.sourceUrl ?? form.sourceUrl,
    sheen: suggested.sheen ?? form.sheen,
    sheenOptionsText: formatted.sheenOptionsText || form.sheenOptionsText,
    paintSystemFeaturesText:
      formatted.paintSystemFeaturesText || form.paintSystemFeaturesText,
    paintSystemFeatureOptionsText:
      formatted.paintSystemFeatureOptionsText ||
      form.paintSystemFeatureOptionsText,
    recommendedUsesText:
      formatted.recommendedUsesText || form.recommendedUsesText,
    productUses: suggested.productUses ?? form.productUses,
    substrates: suggested.substrates ?? form.substrates,
    vocLevel: suggested.vocLevel ?? form.vocLevel,
    volumeSolidsPct:
      suggested.volumeSolidsPct != null
        ? String(suggested.volumeSolidsPct)
        : form.volumeSolidsPct,
    volumeSolidsLabel: suggested.volumeSolidsLabel ?? form.volumeSolidsLabel,
    isSelfPriming: suggested.isSelfPriming ?? form.isSelfPriming,
    isStainBlocking: suggested.isStainBlocking ?? form.isStainBlocking,
    isMoldMildewResistant:
      suggested.isMoldMildewResistant ?? form.isMoldMildewResistant,
    isScrubbable: suggested.isScrubbable ?? form.isScrubbable,
    isOneCoat: suggested.isOneCoat ?? form.isOneCoat,
    canImageUrl:
      selectedCanImageUrl !== undefined
        ? selectedCanImageUrl || form.canImageUrl
        : (lookup.canImageUrl ?? form.canImageUrl),
    canImageStoragePath:
      selectedCanImageUrl !== undefined && selectedCanImageUrl
        ? ""
        : lookup.canImageUrl
          ? ""
          : form.canImageStoragePath,
  };
}
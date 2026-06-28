import {
  assessCanImageQuality,
  formatCanImageQualityRejection,
  isInlineImageDataUrl,
} from "@/lib/product-catalog/can-image-quality";
import {
  isBrochureLikeImageUrl,
  isKnownPaintCanPackshotUrl,
  isSherwinPromoPackshotUrl,
  textCorroboratesManufacturer,
  textCorroboratesProductLine,
  textCorroboratesProductLineStrict,
} from "@/lib/sell-sheet/paint-can-trust";
import { isLikelyNonPaintCanImage } from "@/lib/sell-sheet/paint-can-image";
import { createXaiResponse } from "@/lib/xai/responses";
import type { SellSheetApplicationType } from "@/types/sell-sheet";

export type PaintCanVerifyInput = {
  manufacturer: string;
  paintType: string;
  applicationType: SellSheetApplicationType;
  imageUrl: string;
  sourceUrl?: string | null;
  downloadedImageUrl?: string | null;
  imageBuffer?: Buffer | null;
  imageMime?: string | null;
  /** When true, accept paint-can photos even if label match is uncertain. */
  permissive?: boolean;
  /** Use high detail for final strict checks; low is faster during discovery. */
  visionDetail?: "high" | "low";
  /**
   * Catalog auto-apply: manufacturer + product line must appear in visible label
   * text (not URLs/filenames). Ignores permissive vision-only match flags.
   */
  labelOnlyMatch?: boolean;
  /** Review-modal pick: skip strict URL/size gates on already-vetted candidates. */
  manualSelection?: boolean;
};

function resolveImageRefForHeuristics(input: PaintCanVerifyInput): string | null {
  const primary = input.downloadedImageUrl ?? input.imageUrl;
  if (!primary) return null;
  if (!isInlineImageDataUrl(primary)) return primary;

  const fallback = input.downloadedImageUrl ?? input.sourceUrl ?? null;
  if (fallback && !isInlineImageDataUrl(fallback)) return fallback;

  return null;
}

export type PaintCanVerifyResult =
  | {
      success: true;
      paintCanConfirmed: boolean;
      visibleLabelText: string | null;
    }
  | { success: false; error: string };

const BROCHURE_REJECTION_MARKERS =
  /(?:brochure|sell[-\s]?sheet|literature|flyer|pamphlet|leaflet|data[-\s]?sheet|fact[-\s]?sheet|collateral|document|catalog(?:ue)?|guide|bulletin|coverage[-\s]?chart|color[-\s]?card|application[-\s]?guide|technical[-\s]?sheet|one[-\s]?pager|pdf|multi[-\s]?page|flat[-\s]?lay)/i;

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

function readBoolean(
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

function readString(
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

function textSuggestsBrochure(text: string): boolean {
  return BROCHURE_REJECTION_MARKERS.test(text);
}

function trustSherwinPromoPackshotWithoutVision(
  input: PaintCanVerifyInput,
): PaintCanVerifyResult | null {
  const imageRef = input.downloadedImageUrl ?? input.imageUrl;
  if (!imageRef || !isSherwinPromoPackshotUrl(imageRef)) return null;
  if (!textCorroboratesProductLine(imageRef, input.paintType)) return null;

  if (
    input.imageBuffer &&
    input.imageMime &&
    isLikelyNonPaintCanImage(input.imageBuffer, input.imageMime, imageRef)
  ) {
    return null;
  }

  return {
    success: true,
    paintCanConfirmed: true,
    visibleLabelText: input.paintType,
  };
}

function validateVisionJson(
  json: Record<string, unknown> | null,
  input: PaintCanVerifyInput,
): PaintCanVerifyResult {
  const permissive = input.permissive === true;
  const labelOnlyMatch = input.labelOnlyMatch === true;
  const imageRef = input.downloadedImageUrl ?? input.imageUrl;
  if (imageRef && isBrochureLikeImageUrl(imageRef)) {
    return {
      success: false,
      error:
        "The image URL looks like a brochure or document, not a paint can photo.",
    };
  }

  if (
    input.imageBuffer &&
    input.imageMime &&
    isLikelyNonPaintCanImage(input.imageBuffer, input.imageMime, imageRef)
  ) {
    return {
      success: false,
      error:
        "The image looks like a brochure or document, not a labeled paint can.",
    };
  }

  const isPaintCan = readBoolean(json, ["isPaintCan", "is_paint_can"]);
  const paintCanConfirmed = readBoolean(json, [
    "paintCanConfirmed",
    "paint_can_confirmed",
  ]);
  const isBrochureOrCollateral = readBoolean(json, [
    "isBrochureOrCollateral",
    "is_brochure_or_collateral",
    "isBrochure",
    "is_brochure",
  ]);
  const manufacturerMatches = readBoolean(json, [
    "manufacturerMatches",
    "manufacturer_matches",
  ]);
  const productLineMatches = readBoolean(json, [
    "productLineMatches",
    "product_line_matches",
  ]);
  const visibleLabelText = readString(json, [
    "visibleLabelText",
    "visible_label_text",
    "visibleBranding",
    "visible_branding",
  ]);
  const rejectionReason = readString(json, [
    "rejectionReason",
    "rejection_reason",
  ]);

  const rejectionText = [rejectionReason ?? "", visibleLabelText ?? ""].join(" ");

  if (isBrochureOrCollateral === true || textSuggestsBrochure(rejectionText)) {
    return {
      success: false,
      error:
        rejectionReason ??
        "The image is a brochure, sell sheet, or marketing document — not a paint can photo.",
    };
  }

  if (isPaintCan === false) {
    return {
      success: false,
      error:
        rejectionReason ??
        "The image is not a paint can. Choose a product photo that shows the labeled can.",
    };
  }

  const labelCorpus = (visibleLabelText ?? "").trim();

  if (labelOnlyMatch && !labelCorpus) {
    return {
      success: false,
      error:
        "No readable product label text is visible on the can — cannot verify this is the correct product.",
    };
  }

  if (!permissive && !labelOnlyMatch && manufacturerMatches === false) {
    return {
      success: false,
      error:
        rejectionReason ??
        `The can label does not match the selected manufacturer (${input.manufacturer}).`,
    };
  }

  if (!permissive && !labelOnlyMatch && productLineMatches === false) {
    return {
      success: false,
      error:
        rejectionReason ??
        `The can label does not match the selected paint line (${input.paintType}).`,
    };
  }

  if (paintCanConfirmed === false && !permissive && !labelOnlyMatch) {
    return {
      success: false,
      error:
        rejectionReason ??
        "Could not confirm this is a labeled paint can matching the selected product.",
    };
  }

  const contextText = labelOnlyMatch
    ? labelCorpus
    : [
        labelCorpus,
        rejectionReason ?? "",
        input.sourceUrl ?? "",
        input.downloadedImageUrl ?? "",
        input.imageUrl,
      ].join(" ");

  const hasManufacturerMatch = labelOnlyMatch
    ? textCorroboratesManufacturer(labelCorpus, input.manufacturer)
    : manufacturerMatches === true ||
      textCorroboratesManufacturer(contextText, input.manufacturer);
  const hasProductLineMatch = labelOnlyMatch
    ? textCorroboratesProductLineStrict(labelCorpus, input.paintType)
    : productLineMatches === true ||
      textCorroboratesProductLine(contextText, input.paintType);

  // Early returns above already reject isPaintCan === false and brochure collateral.
  const confirmed = labelOnlyMatch
    ? hasManufacturerMatch && hasProductLineMatch
    : isPaintCan === true && hasManufacturerMatch && hasProductLineMatch;

  if (permissive) {
    return {
      success: true,
      paintCanConfirmed: confirmed,
      visibleLabelText: visibleLabelText,
    };
  }

  if (!confirmed) {
    return {
      success: false,
      error:
        rejectionReason ??
        "Could not confirm the image shows a labeled paint can matching the selected manufacturer and paint line.",
    };
  }

  return {
    success: true,
    paintCanConfirmed: true,
    visibleLabelText: visibleLabelText,
  };
}

export async function verifyPaintCanImage(
  input: PaintCanVerifyInput,
): Promise<PaintCanVerifyResult> {
  const promoTrust = trustSherwinPromoPackshotWithoutVision(input);
  if (promoTrust) return promoTrust;

  const imageRef = input.downloadedImageUrl ?? input.imageUrl;
  const urlForHeuristics = resolveImageRefForHeuristics(input);
  if (urlForHeuristics && isBrochureLikeImageUrl(urlForHeuristics)) {
    return {
      success: false,
      error:
        "The image URL looks like a brochure or document, not a paint can photo.",
    };
  }

  if (
    input.imageBuffer &&
    input.imageMime &&
    isLikelyNonPaintCanImage(
      input.imageBuffer,
      input.imageMime,
      urlForHeuristics,
    )
  ) {
    return {
      success: false,
      error:
        "The image looks like a brochure or document, not a labeled paint can.",
    };
  }

  if (input.imageBuffer && input.imageMime) {
    const trustedPackshot =
      urlForHeuristics != null &&
      (isSherwinPromoPackshotUrl(urlForHeuristics) ||
        isKnownPaintCanPackshotUrl(urlForHeuristics));

    const qualityUrl = urlForHeuristics ?? imageRef ?? "data:image/inline";
    const qualityAssessment = assessCanImageQuality({
      buffer: input.imageBuffer,
      mime: input.imageMime,
      imageUrl: qualityUrl,
      trustedPackshot,
      manualSelection: input.manualSelection === true,
    });

    if (!qualityAssessment.acceptable) {
      return {
        success: false,
        error: formatCanImageQualityRejection(
          qualityAssessment,
          input.imageBuffer.byteLength,
        ),
      };
    }
  }

  const manufacturer = input.manufacturer.trim();
  const paintType = input.paintType.trim();
  const applicationLabel =
    input.applicationType === "interior" ? "Interior" : "Exterior";

  const visionDetail = input.visionDetail ?? "low";

  const response = await createXaiResponse({
    instructions: [
      "You verify paint can product images for painting contractor sell sheets.",
      "Inspect the image carefully and read any visible text on the can label, lid, and front panel.",
      "Return ONLY a JSON object with keys:",
      "isPaintCan, paintCanConfirmed, isBrochureOrCollateral, manufacturerMatches, productLineMatches, applicationMatches, visibleLabelText, rejectionReason.",
      "isPaintCan must be true only when the image shows a single physical paint can, bucket, or gallon container with a visible product label.",
      "isPaintCan must be false for brochures, sell sheets, literature, flyers, pamphlets, PDF page images, technical data sheets, application guides, coverage charts, color cards, multi-product collages, room scenes, swatches, brushes, logos only, and flat document scans.",
      "isBrochureOrCollateral must be true when the image is primarily a brochure, sell sheet, literature, flyer, pamphlet, document page, or marketing collateral instead of a product photo.",
      "manufacturerMatches should be true when the brand is visible or strongly implied on the can label.",
      "productLineMatches should be true when the product line name OR a clear distinctive subset of the product line is visible on the can label (partial matches count when unambiguous).",
      "applicationMatches must be true if interior/exterior on the label matches the expected application; if not visible, true when the label does not contradict the expected application.",
      "paintCanConfirmed must be true only when isPaintCan is true, isBrochureOrCollateral is false, and branding matches the expected manufacturer and paint line.",
      "visibleLabelText must summarize readable branding and product text on the can label.",
      "rejectionReason must explain any failure; use null when paintCanConfirmed is true.",
      "Do not include markdown or commentary.",
    ].join(" "),
    prompt: [
      `Expected manufacturer: ${manufacturer}`,
      `Expected paint line: ${paintType}`,
      `Expected application: ${input.applicationType} (${applicationLabel})`,
      input.sourceUrl
        ? `Official manufacturer product page: ${input.sourceUrl}`
        : null,
      "Reject brochures, sell sheets, literature, and document images. Accept only a labeled paint can or bucket product photo.",
      "Treat abbreviated or truncated label text as a match when the distinctive product name words are clearly present.",
    ]
      .filter(Boolean)
      .join("\n"),
    image: {
      imageUrl: input.imageUrl,
      detail: visionDetail,
    },
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error,
    };
  }

  const json = extractJsonObject(response.text);
  return validateVisionJson(json, input);
}
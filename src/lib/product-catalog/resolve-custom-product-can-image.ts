import type { PaintProductApplication } from "@/lib/product-catalog/types";
import { findPaintCanImageWithGrok } from "@/lib/sell-sheet/paint-can-ai";
import {
  acquirePaintCanImage,
  collectPaintCanImageCandidates,
  downloadPaintCanImageCandidate,
} from "@/lib/sell-sheet/paint-can-image";
import type { SellSheetApplicationType } from "@/types/sell-sheet";

const MAX_CANDIDATES = 4;

function grokApplicationTypes(
  applicationType: PaintProductApplication,
): SellSheetApplicationType[] {
  if (applicationType === "exterior") return ["exterior"];
  if (applicationType === "interior") return ["interior"];
  return ["interior", "exterior"];
}

export async function resolveCustomProductCanImageFromManufacturer(input: {
  manufacturerName: string;
  productName: string;
  applicationType: PaintProductApplication;
  productPageUrl?: string | null;
}): Promise<
  | {
      success: true;
      canImageUrl: string;
      previewDataUrl: string;
      sourceUrl: string | null;
    }
  | { success: false; error: string }
> {
  const manufacturer = input.manufacturerName.trim();
  const productName = input.productName.trim();

  if (!manufacturer || !productName) {
    return {
      success: false,
      error:
        "Enter the manufacturer and product name before loading a can image.",
    };
  }

  let lastError =
    "Could not find a paint can image on the manufacturer site. Paste a can image URL manually or try a more specific product line name.";

  for (const applicationType of grokApplicationTypes(input.applicationType)) {
    const lookup = await findPaintCanImageWithGrok({
      manufacturer,
      paintType: productName,
      applicationType,
    });

    if (!lookup.success) {
      lastError = lookup.error;
      continue;
    }

    const candidateUrls = await collectPaintCanImageCandidates({
      imageUrl: lookup.imageUrl,
      sourceUrl: lookup.sourceUrl ?? input.productPageUrl ?? null,
      paintType: productName,
      manufacturer,
      applicationType,
    });

    for (const candidateUrl of candidateUrls.slice(0, MAX_CANDIDATES)) {
      const downloaded = await downloadPaintCanImageCandidate(candidateUrl);
      if (downloaded.success) {
        return {
          success: true,
          canImageUrl: downloaded.imageUrl,
          previewDataUrl: downloaded.dataUrl,
          sourceUrl: lookup.sourceUrl ?? input.productPageUrl ?? null,
        };
      }
      lastError = downloaded.error;
    }
  }

  const fallbackSourceUrl = input.productPageUrl?.trim();
  if (fallbackSourceUrl) {
    const acquired = await acquirePaintCanImage({
      imageUrl: null,
      sourceUrl: fallbackSourceUrl,
      paintType: productName,
      manufacturer,
      applicationType:
        grokApplicationTypes(input.applicationType)[0] ?? "interior",
    });

    if (acquired.success) {
      return {
        success: true,
        canImageUrl: acquired.imageUrl,
        previewDataUrl: acquired.dataUrl,
        sourceUrl: fallbackSourceUrl,
      };
    }

    lastError = acquired.error;
  }

  return { success: false, error: lastError };
}
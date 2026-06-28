import {
  isLikelyNonPaintCanImage,
  readImageDimensions,
} from "@/lib/sell-sheet/paint-can-image";
import {
  isBrochureLikeImageUrl,
  isKnownPaintCanPackshotUrl,
  isRejectableGenericImageUrl,
  isSherwinPromoPackshotUrl,
} from "@/lib/sell-sheet/paint-can-trust";

/** Minimum usable paint-can photo dimensions for catalog display. */
export const MIN_CAN_IMAGE_MIN_EDGE = 120;
export const MIN_CAN_IMAGE_WIDTH = 140;
export const MIN_CAN_IMAGE_HEIGHT = 175;
export const MIN_CAN_IMAGE_BYTES = 14_000;
export const MIN_CAN_IMAGE_BYTES_NO_DIMS = 20_000;

const THUMBNAIL_URL_MARKERS =
  /(?:thumb(?:nail)?s?|_thumb|icon|sprite|favicon|avatar|badge|swatch|chip[-_]?card|color[-_]?chip|placeholder|spinner|loading|pixel|1x1|(?:^|[/_-])(?:xs|sm|tiny|mini|small)(?:[._-]|$))/i;

const LOW_RES_DIMENSION_IN_URL =
  /(?:[?&](?:w|wid|width|h|hei|height|size|maxwidth|maxheight)=)(\d{1,3})(?:\b|&)/i;

const LOW_RES_PATH_SEGMENT =
  /(?:^|\/)(\d{1,2}x\d{1,2}|\d{2,3}x\d{2,3})(?:\/|\.|$)/i;

export type CanImageQualityAssessment = {
  acceptable: boolean;
  width: number | null;
  height: number | null;
  area: number;
  resolutionScore: number;
};

/** Inline base64 payloads must not be scanned with URL heuristics (false positives). */
export function isInlineImageDataUrl(url: string): boolean {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(url.trim());
}

function resolveUrlForHeuristics(imageUrl: string): string | null {
  return isInlineImageDataUrl(imageUrl) ? null : imageUrl;
}

function parseLowResParamFromUrl(url: string): number | null {
  const dimMatch = url.match(LOW_RES_DIMENSION_IN_URL);
  if (dimMatch?.[1]) {
    const value = Number.parseInt(dimMatch[1], 10);
    if (Number.isFinite(value)) return value;
  }

  const pathMatch = url.match(LOW_RES_PATH_SEGMENT);
  if (pathMatch?.[1]) {
    const [widthRaw, heightRaw] = pathMatch[1].split("x");
    const width = Number.parseInt(widthRaw ?? "", 10);
    const height = Number.parseInt(heightRaw ?? "", 10);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      return Math.max(width, height);
    }
  }

  return null;
}

export function isLikelyLowResolutionImageUrl(url: string): boolean {
  if (isRejectableGenericImageUrl(url) || isBrochureLikeImageUrl(url)) {
    return true;
  }

  if (THUMBNAIL_URL_MARKERS.test(url)) return true;

  const hintedSize = parseLowResParamFromUrl(url);
  if (hintedSize != null && hintedSize < MIN_CAN_IMAGE_MIN_EDGE) {
    return true;
  }

  return false;
}

export function scoreCanImageResolution(input: {
  width: number | null;
  height: number | null;
  byteLength: number;
}): number {
  let score = 0;

  if (input.width != null && input.height != null) {
    const minEdge = Math.min(input.width, input.height);
    const maxEdge = Math.max(input.width, input.height);
    const area = input.width * input.height;

    if (minEdge >= 220) score += 40;
    else if (minEdge >= 180) score += 28;
    else if (minEdge >= MIN_CAN_IMAGE_MIN_EDGE) score += 14;

    if (area >= 90_000) score += 24;
    else if (area >= 45_000) score += 12;

    if (maxEdge >= minEdge * 1.15 && maxEdge / minEdge <= 1.35) {
      score += 8;
    }
  } else if (input.byteLength >= 40_000) {
    score += 10;
  } else if (input.byteLength >= MIN_CAN_IMAGE_BYTES_NO_DIMS) {
    score += 4;
  }

  return score;
}

export function assessCanImageQuality(input: {
  buffer: Buffer;
  mime: string;
  imageUrl: string;
  /** Sherwin Scene7 / known promo packshots may be slightly smaller but trusted. */
  trustedPackshot?: boolean;
  /** Review-modal pick: candidate already passed discovery; relax pixel gates. */
  manualSelection?: boolean;
}): CanImageQualityAssessment {
  const dims = readImageDimensions(input.buffer, input.mime);
  const width = dims?.width ?? null;
  const height = dims?.height ?? null;
  const area = width != null && height != null ? width * height : 0;
  const resolutionScore = scoreCanImageResolution({
    width,
    height,
    byteLength: input.buffer.byteLength,
  });
  const urlForHeuristics = resolveUrlForHeuristics(input.imageUrl);

  if (
    urlForHeuristics &&
    (isRejectableGenericImageUrl(urlForHeuristics) ||
      isBrochureLikeImageUrl(urlForHeuristics) ||
      isLikelyLowResolutionImageUrl(urlForHeuristics))
  ) {
    return {
      acceptable: false,
      width,
      height,
      area,
      resolutionScore,
    };
  }

  if (
    isLikelyNonPaintCanImage(input.buffer, input.mime, urlForHeuristics)
  ) {
    return {
      acceptable: false,
      width,
      height,
      area,
      resolutionScore,
    };
  }

  const trustedPackshot =
    input.trustedPackshot === true ||
    (urlForHeuristics != null &&
      (isSherwinPromoPackshotUrl(urlForHeuristics) ||
        isKnownPaintCanPackshotUrl(urlForHeuristics)));

  if (trustedPackshot) {
    const minEdge =
      width != null && height != null ? Math.min(width, height) : null;
    const trustedAcceptable =
      minEdge == null
        ? input.buffer.byteLength >= 8_000
        : minEdge >= 96 && input.buffer.byteLength >= 6_000;

    return {
      acceptable: trustedAcceptable,
      width,
      height,
      area,
      resolutionScore: resolutionScore + (trustedAcceptable ? 20 : 0),
    };
  }

  if (!dims) {
    const minBytes = input.manualSelection === true ? 6_000 : MIN_CAN_IMAGE_BYTES_NO_DIMS;
    return {
      acceptable: input.buffer.byteLength >= minBytes,
      width,
      height,
      area,
      resolutionScore,
    };
  }

  const pixelWidth = dims.width;
  const pixelHeight = dims.height;
  const minEdge = Math.min(pixelWidth, pixelHeight);
  const maxEdge = Math.max(pixelWidth, pixelHeight);
  const ratio = maxEdge / Math.max(minEdge, 1);

  const acceptable =
    input.manualSelection === true
      ? input.buffer.byteLength >= 6_000 && minEdge >= 96
      : input.buffer.byteLength >= MIN_CAN_IMAGE_BYTES &&
        minEdge >= MIN_CAN_IMAGE_MIN_EDGE &&
        pixelWidth >= MIN_CAN_IMAGE_WIDTH &&
        pixelHeight >= MIN_CAN_IMAGE_HEIGHT &&
        ratio <= 1.35 &&
        pixelHeight >= pixelWidth * 0.6;

  return {
    acceptable,
    width,
    height,
    area,
    resolutionScore,
  };
}

export function meetsMinimumCanImageQuality(input: {
  buffer: Buffer;
  mime: string;
  imageUrl: string;
  trustedPackshot?: boolean;
  manualSelection?: boolean;
}): boolean {
  return assessCanImageQuality(input).acceptable;
}

export function formatCanImageQualityRejection(
  assessment: CanImageQualityAssessment,
  byteLength: number,
): string {
  const dims =
    assessment.width != null && assessment.height != null
      ? `${assessment.width}×${assessment.height}px`
      : "unknown dimensions";
  return `The paint can image is too small or low resolution to verify reliably (${dims}, ${byteLength.toLocaleString()} bytes).`;
}
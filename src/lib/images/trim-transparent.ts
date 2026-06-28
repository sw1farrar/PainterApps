const ALPHA_THRESHOLD = 12;

export type TrimmedImage = {
  src: string;
  width: number;
  height: number;
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function findOpaqueBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        found = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return found ? { minX, minY, maxX, maxY } : null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";

    if (!src.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

function hasTransparency(pixels: Uint8ClampedArray): boolean {
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 250) return true;
  }
  return false;
}

export function scaleImageToFit(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const scale = Math.min(maxWidth / width, maxHeight / height, 1);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function trimTransparentEdges(src: string): Promise<TrimmedImage> {
  if (typeof document === "undefined") {
    return { src, width: 0, height: 0 };
  }

  const image = await loadImage(src);
  const width = image.naturalWidth;
  const height = image.naturalHeight;

  if (!width || !height) {
    return { src, width: 0, height: 0 };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return { src, width, height };
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, width, height);
  const bounds = findOpaqueBounds(imageData.data, width, height);

  if (!bounds) {
    return { src, width, height };
  }

  const { minX, minY, maxX, maxY } = bounds;
  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;

  if (
    minX === 0 &&
    minY === 0 &&
    maxX === width - 1 &&
    maxY === height - 1
  ) {
    return { src, width, height };
  }

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;

  const trimmedContext = trimmedCanvas.getContext("2d");
  if (!trimmedContext) {
    return { src, width, height };
  }

  trimmedContext.drawImage(
    canvas,
    minX,
    minY,
    trimmedWidth,
    trimmedHeight,
    0,
    0,
    trimmedWidth,
    trimmedHeight,
  );

  const trimmedPixels = trimmedContext.getImageData(
    0,
    0,
    trimmedWidth,
    trimmedHeight,
  ).data;
  const mime = hasTransparency(trimmedPixels) ? "image/png" : "image/jpeg";
  const quality = mime === "image/jpeg" ? 0.92 : undefined;

  return {
    src: trimmedCanvas.toDataURL(mime, quality),
    width: trimmedWidth,
    height: trimmedHeight,
  };
}
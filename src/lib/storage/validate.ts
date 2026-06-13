import {
  ALLOWED_IMAGE_TYPES,
  MAX_LOGO_BYTES,
  MAX_PHOTO_BYTES,
} from "@/lib/storage/constants";

export function validateImageFile(
  file: File,
  maxBytes: number = MAX_PHOTO_BYTES,
): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Please upload a JPG, PNG, WebP, or GIF image.";
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return `Image must be ${maxMb}MB or smaller.`;
  }

  return null;
}

export function validateLogoFile(file: File): string | null {
  return validateImageFile(file, MAX_LOGO_BYTES);
}

export function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}
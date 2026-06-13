export const STORAGE_BUCKETS = {
  companyLogos: "company-logos",
  quotePhotos: "quote-photos",
  jobPhotos: "job-photos",
} as const;

export const MAX_LOGO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import { seedSellSheetWithDefaultFeatures } from "@/lib/sell-sheet/feature-defaults";
import { normalizeSellSheetTier } from "@/lib/sell-sheet/normalize-tier";
import { syncAllTierWarranties } from "@/lib/sell-sheet/warranty-from-features";
import { normalizeLogoUrl } from "@/lib/utils";
import type {
  SellSheetApplicationType,
  SellSheetData,
  SellSheetTier,
} from "@/types/sell-sheet";
import type { StoredSellSheetTier } from "@/types/sell-sheet";

function legacyTierApplicationType(
  tier: StoredSellSheetTier,
): SellSheetApplicationType | "" {
  const legacy = tier as StoredSellSheetTier & {
    applicationType?: string;
  };
  if (legacy.applicationType === "interior" || legacy.applicationType === "exterior") {
    return legacy.applicationType;
  }
  return "";
}

export function resolveSheetApplicationType(
  applicationType: string | null | undefined,
  tiers: StoredSellSheetTier[],
): SellSheetApplicationType | "" {
  if (applicationType === "interior" || applicationType === "exterior") {
    return applicationType;
  }

  for (const tier of tiers) {
    const legacy = legacyTierApplicationType(tier);
    if (legacy) return legacy;
  }

  return "";
}

export function applicationTypeForDb(
  applicationType: SellSheetApplicationType | "",
): SellSheetApplicationType | null {
  return applicationType === "interior" || applicationType === "exterior"
    ? applicationType
    : null;
}

export type SellSheetCompanyBranding = {
  companyName: string;
  logoUrl: string | null;
};

const DATA_IMAGE_PATTERN = /^data:image\/[a-z+]+;base64,/i;

function coerceSellSheetLogoUrl(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;

  const trimmed = value.trim();
  if (DATA_IMAGE_PATTERN.test(trimmed)) return trimmed;

  return normalizeLogoUrl(trimmed);
}

export function resolveSellSheetLogo(
  companyLogoUrl: string | null | undefined,
  sellSheetLogoUrl: string | null | undefined,
): string | null {
  return (
    coerceSellSheetLogoUrl(sellSheetLogoUrl) ??
    normalizeLogoUrl(companyLogoUrl) ??
    null
  );
}

export function applyCompanyBrandingToSellSheet(
  data: SellSheetData,
  branding: SellSheetCompanyBranding | null | undefined,
  options?: { applyLogo?: boolean },
): SellSheetData {
  if (!branding) return data;

  const applyLogo = options?.applyLogo ?? true;
  const hasCustomLogo = Boolean(data.logoImage?.trim());

  return {
    ...data,
    companyName: data.companyName.trim() || branding.companyName.trim(),
    logoImage:
      !applyLogo || hasCustomLogo
        ? data.logoImage
        : resolveSellSheetLogo(branding.logoUrl, null),
  };
}

const DATA_URL_PATTERN = /^data:(image\/[a-z+]+);base64,(.+)$/i;

function extensionForMime(mime: string): string {
  switch (mime.toLowerCase()) {
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

function decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(DATA_URL_PATTERN);
  if (!match) return null;

  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function getPublicUrl(path: string): string {
  const admin = createAdminClient();
  const { data } = admin.storage
    .from(STORAGE_BUCKETS.sellSheetAssets)
    .getPublicUrl(path);
  return data.publicUrl;
}

function normalizeStoredImageUrl(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  return value.trim();
}

async function uploadDataUrl(
  dataUrl: string | null,
  path: string,
): Promise<string | null> {
  const normalized = normalizeStoredImageUrl(dataUrl);
  if (!normalized?.startsWith("data:")) {
    return normalized;
  }

  const decoded = decodeDataUrl(normalized);
  if (!decoded) return null;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(STORAGE_BUCKETS.sellSheetAssets)
    .upload(path, decoded.buffer, {
      upsert: true,
      contentType: decoded.mime,
    });

  if (error) {
    throw new Error(error.message);
  }

  return getPublicUrl(path);
}

export async function persistSellSheetAssets(
  data: SellSheetData,
  companyId: string,
  sellSheetId: string,
): Promise<{
  logoUrl: string | null;
  tiers: StoredSellSheetTier[];
}> {
  const synced = syncAllTierWarranties(data);
  const logoMatch = synced.logoImage?.match(DATA_URL_PATTERN);
  const logoExt = logoMatch
    ? extensionForMime(logoMatch[1])
    : "jpg";
  const logoStoragePath = synced.logoImage?.startsWith("data:")
    ? `${companyId}/sell-sheets/${sellSheetId}/logo-${Date.now()}.${logoExt}`
    : `${companyId}/sell-sheets/${sellSheetId}/logo.${logoExt}`;
  const logoUrl = await uploadDataUrl(synced.logoImage, logoStoragePath);

  const tiers: StoredSellSheetTier[] = [];

  for (const tier of synced.tiers) {
    const ext = tier.paintCanImage?.match(DATA_URL_PATTERN)?.[1]
      ? extensionForMime(
          tier.paintCanImage.match(DATA_URL_PATTERN)![1],
        )
      : "jpg";

    const paintCanImage = await uploadDataUrl(
      tier.paintCanImage,
      `${companyId}/sell-sheets/${sellSheetId}/${tier.key}-can.${ext}`,
    );

    tiers.push({
      ...normalizeSellSheetTier(tier),
      paintCanImage,
    });
  }

  return { logoUrl, tiers };
}

export function sellSheetDataFromStored(
  companyName: string,
  companyLogoUrl: string | null,
  stored: {
    project_name: string | null;
    application_type?: string | null;
    logo_url: string | null;
    tiers: StoredSellSheetTier[] | null;
  },
): SellSheetData {
  const tiers = (stored.tiers ?? []).map((tier) => normalizeSellSheetTier(tier));

  return seedSellSheetWithDefaultFeatures(
    syncAllTierWarranties({
      companyName,
      projectName: stored.project_name ?? "",
      applicationType: resolveSheetApplicationType(
        stored.application_type,
        stored.tiers ?? [],
      ),
      logoImage: resolveSellSheetLogo(companyLogoUrl, stored.logo_url),
      tiers,
    }),
  );
}

export function slugifyCompanyName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || `company-${randomUUID().slice(0, 8)}`;
}

export async function uniqueCompanySlug(baseName: string): Promise<string> {
  const admin = createAdminClient();
  let slug = slugifyCompanyName(baseName);
  let attempt = 0;

  while (attempt < 5) {
    const { data } = await admin
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;

    attempt += 1;
    slug = `${slugifyCompanyName(baseName)}-${randomUUID().slice(0, 6)}`;
  }

  return `${slugifyCompanyName(baseName)}-${randomUUID().slice(0, 8)}`;
}

export function serializeTiersForDb(tiers: SellSheetTier[]): StoredSellSheetTier[] {
  return tiers.map((tier) => normalizeSellSheetTier(tier));
}
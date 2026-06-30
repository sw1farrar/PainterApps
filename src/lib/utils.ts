import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** USD with exactly two decimal places — for product costs and prices. */
export function formatCurrencyWithCents(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function toMoneyInputString(amount: number): string {
  return (Number.isFinite(amount) ? amount : 0).toFixed(2);
}

export function parseMoneyInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoneyInputOnBlur(value: string): string {
  return toMoneyInputString(parseMoneyInput(value));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isAbsoluteHttpUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeLogoUrl(value: string | null | undefined): string | null {
  if (!isAbsoluteHttpUrl(value)) return null;

  try {
    const url = new URL(value!.trim());
    url.searchParams.delete("v");
    const normalized = url.toString();
    return normalized.endsWith("?") ? normalized.slice(0, -1) : normalized;
  } catch {
    return null;
  }
}

function versionedAssetDisplayUrl(
  assetUrl: string | null | undefined,
  updatedAt?: string | null,
): string | null {
  const normalized = normalizeLogoUrl(assetUrl);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    if (updatedAt) {
      const version = Date.parse(updatedAt);
      url.searchParams.set("v", Number.isFinite(version) ? String(version) : updatedAt);
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function manufacturerLogoDisplayUrl(
  logoUrl: string | null | undefined,
  updatedAt?: string | null,
): string | null {
  return versionedAssetDisplayUrl(logoUrl, updatedAt);
}

/** Bust CDN/browser cache when a product can is re-uploaded to the same storage path. */
export function productCanImageDisplayUrl(
  canImageUrl: string | null | undefined,
  updatedAt?: string | null,
): string | null {
  return versionedAssetDisplayUrl(canImageUrl, updatedAt);
}
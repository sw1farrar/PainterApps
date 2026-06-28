import type { BenefitLibrary } from "@/lib/sell-sheet/benefit-library";
import type { SellSheetData } from "@/types/sell-sheet";

const STORAGE_KEY = "painterapps:sell-sheet-draft";
const DRAFT_VERSION = 1;
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SellSheetDraft = {
  version: typeof DRAFT_VERSION;
  data: SellSheetData;
  sellSheetId?: string;
  createdWhileLoggedOut: boolean;
  updatedAt: number;
  /** Guest-only benefit library (custom items + catalog hides). */
  benefitLibrary?: BenefitLibrary;
};

export function sellSheetDraftHasContent(data: SellSheetData): boolean {
  if (
    data.companyName.trim() ||
    data.projectName.trim() ||
    data.logoImage ||
    data.applicationType
  ) {
    return true;
  }

  return data.tiers.some(
    (tier) =>
      tier.manufacturer.trim() ||
      tier.paintType.trim() ||
      tier.paintCanImage ||
      (tier.features?.length ?? 0) > 0 ||
      (tier.paintSystemFeatures?.length ?? 0) > 0 ||
      (tier.paintSystemFeatureOptions?.length ?? 0) > 0,
  );
}

function isValidDraft(value: unknown): value is SellSheetDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as SellSheetDraft;
  return (
    draft.version === DRAFT_VERSION &&
    typeof draft.updatedAt === "number" &&
    typeof draft.createdWhileLoggedOut === "boolean" &&
    draft.data != null &&
    typeof draft.data === "object" &&
    Array.isArray(draft.data.tiers)
  );
}

export function readSellSheetDraft(): SellSheetDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidDraft(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (Date.now() - parsed.updatedAt > MAX_DRAFT_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeSellSheetDraft(input: {
  data: SellSheetData;
  sellSheetId?: string;
  isLoggedIn: boolean;
  createdWhileLoggedOut?: boolean;
  benefitLibrary?: BenefitLibrary;
}): boolean {
  if (typeof window === "undefined") return false;

  const existing = readSellSheetDraft();
  const createdWhileLoggedOut =
    input.createdWhileLoggedOut ??
    existing?.createdWhileLoggedOut ??
    !input.isLoggedIn;

  const draft: SellSheetDraft = {
    version: DRAFT_VERSION,
    data: input.data,
    sellSheetId: input.sellSheetId,
    createdWhileLoggedOut,
    updatedAt: Date.now(),
    benefitLibrary: input.benefitLibrary ?? existing?.benefitLibrary,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearSellSheetDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
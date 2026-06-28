"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { getSession, requireSession } from "@/lib/auth/session";
import {
  applicationTypeForDb,
  persistSellSheetAssets,
  uniqueCompanySlug,
} from "@/lib/sell-sheet/persist";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import {
  benefitLibraryHasContent,
  mergeBenefitLibraries,
  parseBenefitLibrary,
  type BenefitLibrary,
} from "@/lib/sell-sheet/benefit-library";
import { normalizePhoneForStorage } from "@/lib/phone";
import { getXaiEnvError } from "@/lib/xai/env";
import { normalizeSellSheetTier } from "@/lib/sell-sheet/normalize-tier";
import { applyDiscoveredPaintSystemFeatures } from "@/lib/sell-sheet/sell-sheet-limits";
import { findPaintCanImageWithGrok } from "@/lib/sell-sheet/paint-can-ai";
import { preparePaintSystemFeatures } from "@/lib/sell-sheet/paint-system-features";

import { verifyPaintCanImage } from "@/lib/sell-sheet/paint-can-verify";
import {
  collectPaintCanImageCandidates,
  downloadPaintCanImageCandidate,
  uploadPaintCanImage,
} from "@/lib/sell-sheet/paint-can-image";
import { normalizeLogoUrl } from "@/lib/utils";
import type {
  SellSheetApplicationType,
  SellSheetData,
  SellSheetTierKey,
} from "@/types/sell-sheet";
import type { StoredSellSheetTier } from "@/types/sell-sheet";

export type SellSheetActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function companyLogoForDbUpdate(
  value: string | null | undefined,
): string | null | undefined {
  if (value == null) return value === null ? null : undefined;
  if (!value.trim()) return null;
  if (value.trim().startsWith("data:")) return undefined;
  return normalizeLogoUrl(value);
}

export type SellSheetAuthState = {
  isLoggedIn: boolean;
  companyName: string | null;
};

export async function getSellSheetAuthState(): Promise<SellSheetAuthState> {
  const session = await getSession();
  if (!session) {
    return { isLoggedIn: false, companyName: null };
  }

  return {
    isLoggedIn: true,
    companyName: session.company?.name ?? null,
  };
}

async function ensureCompanyForUser(
  userId: string,
  input: {
    companyName: string;
    email: string;
    phone: string;
    logoUrl?: string | null;
  },
): Promise<{ companyId: string } | { error: string }> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();

  const logoUrl = companyLogoForDbUpdate(input.logoUrl);

  const companyPayload = {
    name: input.companyName.trim(),
    slug: await uniqueCompanySlug(input.companyName),
    email: input.email.trim(),
    phone: normalizePhoneForStorage(input.phone),
    ...(logoUrl !== undefined ? { logo_url: logoUrl } : {}),
    onboarding_complete: true,
  };

  if (profile?.company_id) {
    const { error } = await admin
      .from("companies")
      .update(companyPayload)
      .eq("id", profile.company_id);

    if (error) return { error: error.message };

    return { companyId: profile.company_id };
  }

  const companyId = randomUUID();
  const { error: companyError } = await admin.from("companies").insert({
    id: companyId,
    ...companyPayload,
  });

  if (companyError) return { error: companyError.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ company_id: companyId })
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  const { data: existingRules } = await admin
    .from("quote_upgrade_rules")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!existingRules) {
    await admin.from("quote_upgrade_rules").insert({
      company_id: companyId,
    });
  }

  return { companyId };
}

async function mergeGuestBenefitLibraryIntoCompany(
  companyId: string,
  guestLibrary?: BenefitLibrary,
): Promise<void> {
  if (!guestLibrary || !benefitLibraryHasContent(guestLibrary)) return;

  const admin = createAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("sell_sheet_benefit_library")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) return;

  const current = parseBenefitLibrary(company.sell_sheet_benefit_library);
  const merged = mergeBenefitLibraries(current, guestLibrary);

  await admin
    .from("companies")
    .update({ sell_sheet_benefit_library: merged })
    .eq("id", companyId);
}

async function insertSellSheet(
  companyId: string,
  userId: string,
  data: SellSheetData,
): Promise<{ sellSheetId: string } | { error: string }> {
  const sellSheetId = randomUUID();

  try {
    const { logoUrl, tiers } = await persistSellSheetAssets(
      data,
      companyId,
      sellSheetId,
    );

    const admin = createAdminClient();
    const { error } = await admin.from("sell_sheets").insert({
      id: sellSheetId,
      company_id: companyId,
      created_by: userId,
      project_name: data.projectName.trim() || null,
      application_type: applicationTypeForDb(data.applicationType),
      logo_url: logoUrl,
      tiers,
    });

    if (error) return { error: error.message };

    if (logoUrl) {
      await admin
        .from("companies")
        .update({ logo_url: logoUrl })
        .eq("id", companyId);
    }

    return { sellSheetId };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to save sell sheet.",
    };
  }
}

export async function saveSellSheetForUser(
  data: SellSheetData,
  sellSheetId?: string,
  guestBenefitLibrary?: BenefitLibrary,
): Promise<SellSheetActionResult<{ sellSheetId: string }>> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireSession();
  const dataForSave: SellSheetData = {
    ...data,
    companyName: data.companyName.trim() || session.company?.name || "",
  };

  if (!dataForSave.companyName.trim()) {
    return { success: false, error: "Company name is required." };
  }

  const supabase = await createClient();

  const companyResult = await ensureCompanyForUser(session.profile.id, {
    companyName: dataForSave.companyName,
    email: session.company?.email ?? "",
    phone: session.company?.phone ?? "",
    logoUrl: dataForSave.logoImage,
  });

  if ("error" in companyResult) {
    return { success: false, error: companyResult.error };
  }

  await mergeGuestBenefitLibraryIntoCompany(
    companyResult.companyId,
    guestBenefitLibrary,
  );

  if (sellSheetId) {
    try {
      const { logoUrl, tiers } = await persistSellSheetAssets(
        dataForSave,
        companyResult.companyId,
        sellSheetId,
      );

      const { error } = await supabase
        .from("sell_sheets")
        .update({
          project_name: dataForSave.projectName.trim() || null,
          application_type: applicationTypeForDb(dataForSave.applicationType),
          logo_url: logoUrl,
          tiers,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sellSheetId)
        .eq("company_id", companyResult.companyId);

      if (error) return { success: false, error: error.message };

      if (logoUrl) {
        const admin = createAdminClient();
        await admin
          .from("companies")
          .update({ logo_url: logoUrl })
          .eq("id", companyResult.companyId);
      }

      revalidatePath("/app/sell-sheets");
      revalidatePath(`/app/sell-sheets/${sellSheetId}`);
      revalidatePath("/free-tools/build-sell-sheet");
      return { success: true, data: { sellSheetId } };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update sell sheet.",
      };
    }
  }

  const inserted = await insertSellSheet(
    companyResult.companyId,
    session.profile.id,
    dataForSave,
  );

  if ("error" in inserted) {
    return { success: false, error: inserted.error };
  }

  revalidatePath("/app/sell-sheets");
  return { success: true, data: { sellSheetId: inserted.sellSheetId } };
}

async function persistPaintCanAiResultToDatabase(input: {
  companyId: string;
  tierKey: SellSheetTierKey;
  sellSheetId?: string;
  buffer: Buffer;
  mime: string;
  paintSystemFeatures: string[];
}): Promise<void> {
  const uploaded = await uploadPaintCanImage(
    input.companyId,
    input.tierKey,
    input.buffer,
    input.mime,
    input.sellSheetId,
  );

  if (!uploaded.success || !input.sellSheetId) return;

  const supabase = await createClient();
  const { data: record, error: fetchError } = await supabase
    .from("sell_sheets")
    .select("tiers")
    .eq("id", input.sellSheetId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (fetchError || !record?.tiers) return;

  const tiers = (record.tiers as StoredSellSheetTier[]).map((tier) => {
    const normalized = normalizeSellSheetTier(tier);

    if (tier.key !== input.tierKey) {
      return normalized;
    }

    const discovered = applyDiscoveredPaintSystemFeatures(
      input.paintSystemFeatures,
      normalized.paintSystemFeatureOptions,
    );

    return {
      ...normalized,
      paintCanImage: uploaded.publicUrl,
      paintSystemFeatureOptions:
        input.paintSystemFeatures.length > 0
          ? discovered.options
          : normalized.paintSystemFeatureOptions,
      paintSystemFeatures:
        input.paintSystemFeatures.length > 0
          ? discovered.selected
          : normalized.paintSystemFeatures,
    };
  });

  const { error: updateError } = await supabase
    .from("sell_sheets")
    .update({
      tiers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.sellSheetId)
    .eq("company_id", input.companyId);

  if (updateError) return;

  revalidatePath(`/app/sell-sheets/${input.sellSheetId}`);
  revalidatePath("/free-tools/build-sell-sheet");
}

export async function findPaintCanImageWithAi(input: {
  manufacturer: string;
  paintType: string;
  applicationType: SellSheetApplicationType | "";
  tierKey: SellSheetTierKey;
  sellSheetId?: string;
}): Promise<
  SellSheetActionResult<{
    imageUrl: string;
    sourceUrl: string | null;
    paintSystemFeatures: string[];
    storedInDatabase: boolean;
  }>
> {
  const xaiError = getXaiEnvError();
  if (xaiError) return { success: false, error: xaiError };

  const manufacturer = input.manufacturer.trim();
  const paintType = input.paintType.trim();
  const applicationType = input.applicationType;
  if (!manufacturer || !paintType || !applicationType) {
    return {
      success: false,
      error:
        "Select interior or exterior and enter the manufacturer and paint line before using AI.",
    };
  }

  let lookup: Awaited<ReturnType<typeof findPaintCanImageWithGrok>> | null =
    null;
  let downloaded: Awaited<
    ReturnType<typeof downloadPaintCanImageCandidate>
  > | null = null;
  let verifyError: string | null = null;

  const MAX_LOOKUP_ATTEMPTS = 2;
  const MAX_IMAGE_CANDIDATES = 4;

  lookupLoop: for (let attempt = 0; attempt < MAX_LOOKUP_ATTEMPTS; attempt += 1) {
    const lookupResult = await findPaintCanImageWithGrok({
      manufacturer,
      paintType,
      applicationType,
      retryReason: attempt > 0 ? verifyError ?? undefined : undefined,
    });

    if (!lookupResult.success) {
      return { success: false, error: lookupResult.error };
    }

    const imageCandidates = await collectPaintCanImageCandidates({
      imageUrl: lookupResult.imageUrl,
      sourceUrl: lookupResult.sourceUrl,
      paintType,
      manufacturer,
      applicationType,
    });

    const candidatesToTry = imageCandidates.slice(0, MAX_IMAGE_CANDIDATES);
    let lastDownloadError: string | null = null;
    let matchedCandidate = false;

    for (const candidateUrl of candidatesToTry) {
      const downloadedResult =
        await downloadPaintCanImageCandidate(candidateUrl);

      if (!downloadedResult.success) {
        lastDownloadError = downloadedResult.error;
        continue;
      }

      const verifyResult = await verifyPaintCanImage({
        manufacturer,
        paintType,
        applicationType,
        imageUrl: downloadedResult.dataUrl,
        sourceUrl: lookupResult.sourceUrl,
        downloadedImageUrl: downloadedResult.imageUrl,
        imageBuffer: downloadedResult.buffer,
        imageMime: downloadedResult.mime,
      });

      if (verifyResult.success && verifyResult.paintCanConfirmed) {
        lookup = lookupResult;
        downloaded = downloadedResult;
        matchedCandidate = true;
        break lookupLoop;
      }

      verifyError =
        verifyResult.success === false
          ? verifyResult.error
          : "Could not confirm the image shows a labeled paint can matching the selected product.";
    }

    if (!matchedCandidate && lastDownloadError) {
      verifyError = lastDownloadError;
    }
  }

  if (!lookup?.success || !downloaded?.success) {
    return {
      success: false,
      error:
        verifyError ??
        "Could not find a labeled paint can image matching the selected product.",
    };
  }

  const paintSystemFeatures = preparePaintSystemFeatures(
    lookup.paintSystemFeatures,
  );

  const session = await getSession();
  const companyId = session?.company?.id;

  if (companyId) {
    after(() =>
      persistPaintCanAiResultToDatabase({
        companyId,
        tierKey: input.tierKey,
        sellSheetId: input.sellSheetId,
        buffer: downloaded.buffer,
        mime: downloaded.mime,
        paintSystemFeatures,
      }),
    );
  }

  return {
    success: true,
    data: {
      imageUrl: downloaded.dataUrl,
      sourceUrl: lookup.sourceUrl,
      paintSystemFeatures,
      storedInDatabase: Boolean(companyId),
    },
  };
}
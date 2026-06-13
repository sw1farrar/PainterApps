"use server";

import { revalidatePath } from "next/cache";

import { requireOnboarded, requireSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import { fileExtension, validateImageFile, validateLogoFile } from "@/lib/storage/validate";

export type StorageActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function getPublicUrl(bucket: string, path: string): string {
  const admin = createAdminClient();
  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function getCompanyId(): Promise<string> {
  const session = await requireSession();
  const companyId = session.company?.id;
  if (!companyId) {
    throw new Error("Complete company setup before uploading files.");
  }
  return companyId;
}

export async function uploadCompanyLogo(
  formData: FormData,
): Promise<StorageActionResult<{ url: string }>> {
  try {
    const companyId = await getCompanyId();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Choose an image to upload." };
    }

    const validationError = validateLogoFile(file);
    if (validationError) return { success: false, error: validationError };

    const admin = createAdminClient();
    const path = `${companyId}/logo.${fileExtension(file)}`;

    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKETS.companyLogos)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) return { success: false, error: uploadError.message };

    const publicUrl = getPublicUrl(STORAGE_BUCKETS.companyLogos, path);

    const { error: updateError } = await admin
      .from("companies")
      .update({ logo_url: publicUrl })
      .eq("id", companyId);

    if (updateError) return { success: false, error: updateError.message };

    revalidatePath("/app/onboarding");
    revalidatePath("/app/dashboard");

    return { success: true, data: { url: publicUrl } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload logo.",
    };
  }
}

export async function uploadQuotePhoto(
  formData: FormData,
): Promise<StorageActionResult<{ url: string }>> {
  try {
    await requireOnboarded();
    const companyId = await getCompanyId();
    const quoteId = String(formData.get("quoteId") ?? "").trim();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Choose an image to upload." };
    }

    const validationError = validateImageFile(file);
    if (validationError) return { success: false, error: validationError };

    const admin = createAdminClient();
    const folder = quoteId || "drafts";
    const path = `${companyId}/${folder}/${crypto.randomUUID()}.${fileExtension(file)}`;

    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKETS.quotePhotos)
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) return { success: false, error: uploadError.message };

    return {
      success: true,
      data: { url: getPublicUrl(STORAGE_BUCKETS.quotePhotos, path) },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload photo.",
    };
  }
}

async function removeStoragePhoto(
  photoUrl: string,
  bucket: string,
): Promise<StorageActionResult> {
  const companyId = await getCompanyId();
  const marker = `/storage/v1/object/public/${bucket}/`;

  if (!photoUrl.includes(marker)) {
    return { success: true, data: undefined };
  }

  const path = photoUrl.split(marker)[1];
  if (!path || !path.startsWith(`${companyId}/`)) {
    return { success: false, error: "Invalid photo path." };
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).remove([path]);

  if (error) return { success: false, error: error.message };

  return { success: true, data: undefined };
}

export async function removeQuotePhoto(
  photoUrl: string,
): Promise<StorageActionResult> {
  try {
    return await removeStoragePhoto(photoUrl, STORAGE_BUCKETS.quotePhotos);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove photo.",
    };
  }
}

export async function uploadJobPhoto(
  formData: FormData,
): Promise<StorageActionResult<{ url: string }>> {
  try {
    await requireOnboarded();
    const companyId = await getCompanyId();
    const jobId = String(formData.get("jobId") ?? "").trim();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Choose an image to upload." };
    }

    const validationError = validateImageFile(file);
    if (validationError) return { success: false, error: validationError };

    const admin = createAdminClient();
    const folder = jobId || "drafts";
    const path = `${companyId}/${folder}/${crypto.randomUUID()}.${fileExtension(file)}`;

    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKETS.jobPhotos)
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) return { success: false, error: uploadError.message };

    return {
      success: true,
      data: { url: getPublicUrl(STORAGE_BUCKETS.jobPhotos, path) },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload photo.",
    };
  }
}

export async function removeJobPhoto(
  photoUrl: string,
): Promise<StorageActionResult> {
  try {
    return await removeStoragePhoto(photoUrl, STORAGE_BUCKETS.jobPhotos);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove photo.",
    };
  }
}
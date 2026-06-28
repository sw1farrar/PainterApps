import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import { fileExtension, validateLogoFile } from "@/lib/storage/validate";

export type UploadCompanyLogoResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function uploadCompanyLogoClient(
  file: File,
  companyId: string,
): Promise<UploadCompanyLogoResult> {
  const validationError = validateLogoFile(file);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = createClient();
  const path = `${companyId}/logo-${Date.now()}.${fileExtension(file)}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.companyLogos)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKETS.companyLogos)
    .getPublicUrl(path);

  const publicUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from("companies")
    .update({ logo_url: publicUrl })
    .eq("id", companyId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, url: publicUrl };
}
"use server";

import { revalidatePath } from "next/cache";

import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { isAbsoluteHttpUrl } from "@/lib/utils";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function updateProfile(data: {
  fullName: string;
  avatarUrl?: string;
}): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  const fullName = data.fullName.trim();

  if (!fullName) {
    return { success: false, error: "Name is required." };
  }

  const avatarUrl = data.avatarUrl?.trim();
  if (avatarUrl && !isAbsoluteHttpUrl(avatarUrl)) {
    return { success: false, error: "Avatar must be a valid http:// or https:// URL." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      avatar_url: avatarUrl || null,
    })
    .eq("id", session.profile.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/profile");
  revalidatePath("/app/dashboard");
  return { success: true };
}
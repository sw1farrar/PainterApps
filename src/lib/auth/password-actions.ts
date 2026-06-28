"use server";

import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";

export type PasswordActionResult = {
  success: boolean;
  error?: string;
};

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<PasswordActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  await requireSession();

  const currentPassword = data.currentPassword;
  const newPassword = data.newPassword.trim();

  if (!currentPassword) {
    return { success: false, error: "Enter your current password." };
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      error: "New password must be at least 8 characters.",
    };
  }

  if (currentPassword === newPassword) {
    return {
      success: false,
      error: "Choose a different password than your current one.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "Could not verify your account." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { success: false, error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
"use server";

import {
  provisionCompanyFromSignupMetadata,
  readSignupCompanyMetadata,
} from "@/lib/auth/provision-company";
import { resolvePostLoginRedirect, sanitizeLoginRedirect } from "@/lib/auth/login-redirect";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";

export type VerifyEmailActionResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

export async function resendConfirmationEmail(
  email?: string,
): Promise<VerifyEmailActionResult | { success: true }> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const targetEmail = email?.trim() || user?.email;
  if (!targetEmail) {
    return {
      success: false,
      error: "Enter your email address to resend the confirmation code.",
    };
  }

  if (user?.email_confirmed_at) {
    return { success: false, error: "Your email is already confirmed." };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: targetEmail,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function verifySignupEmailCode(input: {
  email: string;
  code: string;
  next?: string | null;
}): Promise<VerifyEmailActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const email = input.email.trim();
  const code = input.code.trim();

  if (!email) return { success: false, error: "Email is required." };
  if (!/^\d{6}$/.test(code)) {
    return { success: false, error: "Enter the 6-digit code from your email." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "signup",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const user = data.user;
  if (!user) {
    return { success: false, error: "Verification succeeded but no user was returned." };
  }

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const signupMeta = readSignupCompanyMetadata(metadata);

  if (signupMeta.companyName) {
    const provisioned = await provisionCompanyFromSignupMetadata(
      user.id,
      user.email ?? email,
      metadata,
    );

    if ("error" in provisioned) {
      return { success: false, error: provisioned.error };
    }
  }

  const safeNext = sanitizeLoginRedirect(input.next ?? null);
  const redirectTo = safeNext ?? resolvePostLoginRedirect(input.next);

  return { success: true, redirectTo };
}
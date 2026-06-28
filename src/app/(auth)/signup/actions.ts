"use server";

import {
  provisionCompanyFromSignupMetadata,
  readSignupCompanyMetadata,
} from "@/lib/auth/provision-company";
import { createClient } from "@/lib/supabase/server";
import { acceptTeamInvite, getInvitePreview } from "@/lib/team/invites";

export async function loadInvitePreview(token: string) {
  if (!token.trim()) return null;
  return getInvitePreview(token.trim());
}

export async function provisionCompanyAfterSignup(): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "Could not verify your account." };
  }

  if (!user.email_confirmed_at) {
    return { success: true };
  }

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const signupMeta = readSignupCompanyMetadata(metadata);

  if (!signupMeta.companyName) {
    return { success: true };
  }

  const provisioned = await provisionCompanyFromSignupMetadata(
    user.id,
    user.email,
    metadata,
  );

  if ("error" in provisioned) {
    return { success: false, error: provisioned.error };
  }

  return { success: true };
}

export async function acceptInviteAfterSignup(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false as const, error: "Could not verify your account." };
  }

  return acceptTeamInvite(token.trim(), user.id, user.email);
}
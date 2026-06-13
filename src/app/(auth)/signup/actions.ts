"use server";

import { createClient } from "@/lib/supabase/server";
import { acceptTeamInvite, getInvitePreview } from "@/lib/team/invites";

export async function loadInvitePreview(token: string) {
  if (!token.trim()) return null;
  return getInvitePreview(token.trim());
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
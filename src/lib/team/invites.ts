import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

export type TeamInvitePreview = {
  email: string;
  role: UserRole;
  companyName: string;
  expired: boolean;
  accepted: boolean;
};

export async function getInvitePreview(
  token: string,
): Promise<TeamInvitePreview | null> {
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("team_invites")
    .select("email, role, expires_at, accepted_at, company_id")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return null;

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", invite.company_id)
    .maybeSingle();

  return {
    email: invite.email,
    role: invite.role as UserRole,
    companyName: company?.name ?? "your team",
    expired: new Date(invite.expires_at) < new Date(),
    accepted: Boolean(invite.accepted_at),
  };
}

export async function acceptTeamInvite(
  token: string,
  userId: string,
  userEmail: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("team_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return { success: false, error: "Invite not found or already used." };
  }

  if (invite.accepted_at) {
    return { success: false, error: "This invite has already been accepted." };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { success: false, error: "This invite has expired." };
  }

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return {
      success: false,
      error: "Sign in with the email address that received the invite.",
    };
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single();

  if (existingProfile?.company_id && existingProfile.company_id !== invite.company_id) {
    return {
      success: false,
      error: "Your account is already linked to another company.",
    };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      company_id: invite.company_id,
      role: invite.role,
    })
    .eq("id", userId);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const { error: inviteError } = await admin
    .from("team_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (inviteError) {
    return { success: false, error: inviteError.message };
  }

  const { error: companyError } = await admin
    .from("companies")
    .update({ onboarding_complete: true })
    .eq("id", invite.company_id);

  if (companyError) {
    return { success: false, error: companyError.message };
  }

  return { success: true };
}
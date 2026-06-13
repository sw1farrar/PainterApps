"use server";

import { revalidatePath } from "next/cache";

import { requireOnboarded } from "@/lib/auth/session";
import { sendEmail, teamInviteEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import type { UserRole } from "@/types/database";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

const ROLE_OPTIONS: UserRole[] = [
  "admin",
  "project_manager",
  "job_superintendent",
  "painter",
  "finance",
];

function assertAdmin(role: UserRole) {
  if (role !== "admin") {
    throw new Error("Only admins can manage the team.");
  }
}

export async function inviteTeamMember(data: {
  email: string;
  role: UserRole;
}): Promise<ActionResult<{ inviteUrl: string }>> {
  try {
    const envError = getSupabaseEnvError();
    if (envError) return { success: false, error: envError };

    const session = await requireOnboarded();
    assertAdmin(session.profile.role);

    const email = data.email.trim().toLowerCase();
    if (!email) return { success: false, error: "Email is required." };
    if (!ROLE_OPTIONS.includes(data.role)) {
      return { success: false, error: "Invalid role." };
    }

    const supabase = await createClient();
    const companyId = session.company!.id;

    const { data: invite, error } = await supabase
      .from("team_invites")
      .insert({
        company_id: companyId,
        email,
        role: data.role,
        invited_by: session.profile.id,
      })
      .select("token")
      .single();

    if (error || !invite) {
      return { success: false, error: error?.message ?? "Failed to create invite." };
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/signup?invite=${invite.token}`;

    const template = teamInviteEmail({
      companyName: session.company!.name,
      role: data.role.replace(/_/g, " "),
      inviteUrl,
    });
    const emailResult = await sendEmail({
      to: email,
      ...template,
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error };
    }

    revalidatePath("/app/team");
    return { success: true, data: { inviteUrl } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send invite.",
    };
  }
}

export async function updateMemberRole(
  memberId: string,
  role: UserRole,
): Promise<ActionResult> {
  try {
    const envError = getSupabaseEnvError();
    if (envError) return { success: false, error: envError };

    const session = await requireOnboarded();
    assertAdmin(session.profile.role);

    if (memberId === session.profile.id) {
      return { success: false, error: "You cannot change your own role here." };
    }

    if (!ROLE_OPTIONS.includes(role)) {
      return { success: false, error: "Invalid role." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", memberId)
      .eq("company_id", session.company!.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/team");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update role.",
    };
  }
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  try {
    const envError = getSupabaseEnvError();
    if (envError) return { success: false, error: envError };

    const session = await requireOnboarded();
    assertAdmin(session.profile.role);

    const supabase = await createClient();
    const { error } = await supabase
      .from("team_invites")
      .delete()
      .eq("id", inviteId)
      .eq("company_id", session.company!.id)
      .is("accepted_at", null);

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/team");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke invite.",
    };
  }
}
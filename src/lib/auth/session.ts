import "server-only";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isSiteAdmin,
  type AppSession,
} from "@/lib/auth/app-session";
import type { Company, Profile } from "@/types/database";

export type { AppSession } from "@/lib/auth/app-session";
export { isSiteAdmin } from "@/lib/auth/app-session";

async function loadProfile(userId: string, fullName: string | null) {
  const supabase = await createClient();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) return { profile: existingProfile as Profile, error: null };

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      full_name: fullName,
      role: "admin",
      is_site_admin: false,
    })
    .select("*")
    .maybeSingle();

  if (insertedProfile) return { profile: insertedProfile as Profile, error: null };

  try {
    const admin = createAdminClient();
    const { data: adminProfile, error: adminError } = await admin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: fullName,
        role: "admin",
        is_site_admin: false,
      })
      .select("*")
      .single();

    if (adminProfile) return { profile: adminProfile as Profile, error: null };

    return {
      profile: null,
      error: adminError?.message ?? insertError?.message ?? "Profile could not be created.",
    };
  } catch (error) {
    return {
      profile: null,
      error:
        error instanceof Error
          ? error.message
          : insertError?.message ?? "Profile could not be created.",
    };
  }
}

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function isEmailConfirmed(): Promise<boolean> {
  const user = await getAuthUser();
  return Boolean(user?.email_confirmed_at);
}

export async function requireEmailConfirmed() {
  const user = await getAuthUser();
  if (user && !user.email_confirmed_at) {
    redirect("/verify-email");
  }
}

export async function getSession(): Promise<AppSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? null;

  const { profile, error } = await loadProfile(user.id, fullName);
  if (!profile) {
    console.error("Failed to load profile:", error);
    return null;
  }

  let company: Company | null = null;
  if (profile.company_id) {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single();
    company = data as Company | null;
  }

  return { profile, company };
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();

  if (!session) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    throw new Error(
      "Your account is signed in but the profile could not be loaded. Confirm SUPABASE_SERVICE_ROLE_KEY is set in .env.local, then refresh.",
    );
  }

  return session;
}

export async function requireSiteAdmin(): Promise<AppSession> {
  const session = await requireSession();
  if (!isSiteAdmin(session)) {
    redirect("/app/dashboard");
  }
  return session;
}

export async function requireOnboarded(): Promise<AppSession> {
  const session = await requireSession();
  if (isSiteAdmin(session)) return session;
  if (!session.company?.onboarding_complete) {
    redirect("/app/onboarding");
  }
  return session;
}
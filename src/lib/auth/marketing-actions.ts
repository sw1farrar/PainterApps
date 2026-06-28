"use server";

import { getSession } from "@/lib/auth/session";
import type { UserRole } from "@/types/database";

export type MarketingUser = {
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
};

export async function getMarketingUser(): Promise<MarketingUser | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    fullName: session.profile.full_name,
    avatarUrl: session.profile.avatar_url,
    role: session.profile.role,
  };
}
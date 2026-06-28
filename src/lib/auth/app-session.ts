import type { Company, Profile } from "@/types/database";

export type AppSession = {
  profile: Profile;
  company: Company | null;
};

export function isSiteAdmin(session: AppSession): boolean {
  return Boolean(session.profile.is_site_admin);
}
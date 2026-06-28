import type { Company, Profile } from "@/types/database";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type AdminCompanySummary = Company & {
  user_count: number;
};

export type AdminUserRow = {
  profile: Profile;
  email: string | null;
  email_confirmed: boolean;
  company_name: string | null;
};
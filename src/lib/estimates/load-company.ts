import { currentAccess } from "@/lib/auth/access";
import { currentUserId } from "@/lib/auth/current-user";
import {
  companyFromRow,
  emptyLetterCompany,
  type LetterCompany,
} from "@/lib/estimates/letter";
import { createClient, supabaseAdmin } from "@/lib/supabase/server";

const COMPANY_SELECT =
  "name,legal_name,phone,email,website,address,logo_url,license_number,insurance_line,accent_color,proposal_valid_days,payment_terms,exclusions,show_hours_on_proposal,hourly_rate";

export async function loadLetterCompany(): Promise<{
  company: LetterCompany;
  showHours: boolean;
}> {
  const access = await currentAccess();
  const userId = await currentUserId();
  const supabase = await createClient();
  if (supabase && access?.companyId) {
    const { data } = await supabase
      .from("companies")
      .select(COMPANY_SELECT)
      .eq("id", access.companyId)
      .maybeSingle();
    if (data) {
      return {
        company: companyFromRow(data),
        showHours: Boolean(data.show_hours_on_proposal),
      };
    }
  }
  if (supabase && userId) {
    const { data } = await supabase
      .from("company_settings")
      .select("company_name,phone,show_hours_on_proposal")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      return {
        company: companyFromRow(data),
        showHours: Boolean(data.show_hours_on_proposal),
      };
    }
  }
  return { company: emptyLetterCompany(), showHours: false };
}

export async function loadLetterCompanyAdmin(companyId: string | null) {
  const db = supabaseAdmin();
  if (!db || !companyId) return { company: emptyLetterCompany(), showHours: false };
  const { data } = await db
    .from("companies")
    .select(COMPANY_SELECT)
    .eq("id", companyId)
    .maybeSingle();
  if (!data) return { company: emptyLetterCompany(), showHours: false };
  return {
    company: companyFromRow(data),
    showHours: Boolean(data.show_hours_on_proposal),
  };
}

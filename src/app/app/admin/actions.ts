"use server";

import { revalidatePath } from "next/cache";
import { currentAccess } from "@/lib/auth/access";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function setCompanyEstimatePro(formData: FormData) {
  const access = await currentAccess();
  if (!access?.isPlatformAdmin || !access.accessEnabled) return;
  const db = supabaseAdmin();
  if (!db) return;
  const companyId = String(formData.get("company_id") ?? "");
  const enabled = String(formData.get("estimate_pro") ?? "") === "on";
  if (!companyId) return;
  const { data } = await db
    .from("companies")
    .select("features")
    .eq("id", companyId)
    .maybeSingle();
  const features =
    data?.features && typeof data.features === "object"
      ? { ...(data.features as Record<string, unknown>) }
      : {};
  features.estimate_pro = enabled;
  await db.from("companies").update({ features }).eq("id", companyId);
  revalidatePath("/app/admin");
  revalidatePath(`/app/admin/${companyId}`);
}

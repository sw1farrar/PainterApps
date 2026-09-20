"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentAccess } from "@/lib/auth/access";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function setAccountAccess(formData: FormData) {
  const access = await currentAccess();
  if (!access?.isPlatformAdmin || !access.accessEnabled) return;
  const db = supabaseAdmin();
  if (!db) return;
  const userId = String(formData.get("user_id") ?? "");
  const enabled = String(formData.get("access_enabled") ?? "") === "on";
  if (!userId || userId === access.userId) return;
  await db.from("profiles").update({ access_enabled: enabled }).eq("user_id", userId);
  revalidatePath("/app/admin");
}

export async function inviteCompanyUser(formData: FormData) {
  const access = await currentAccess();
  if (!access?.isOwner || !access.companyId || !access.accessEnabled) {
    redirect("/app/team?error=config");
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) redirect("/app/team?error=config");
  const db = supabaseAdmin();
  if (!db) redirect("/app/team?error=config");

  const { data: existingId } = await db.rpc("user_id_for_email", {
    p_email: email,
  });
  const existing =
    typeof existingId === "string" && existingId
      ? { id: existingId }
      : null;

  if (existing) {
    if (existing.id === access.userId) redirect("/app/team?error=self");
    const { data: profile } = await db
      .from("profiles")
      .select("company_id, is_platform_admin")
      .eq("user_id", existing.id)
      .maybeSingle();
    if (profile?.is_platform_admin) redirect("/app/team?error=taken");
    if (profile?.company_id === access.companyId) {
      redirect("/app/team?notice=already");
    }
    if (profile?.company_id) redirect("/app/team?error=taken");
    await db
      .from("profiles")
      .update({
        company_id: access.companyId,
        account_role: "member",
      })
      .eq("user_id", existing.id);
    await db.from("company_members").upsert({
      company_id: access.companyId,
      user_id: existing.id,
      role: "member",
    });
    revalidatePath("/app/team");
    redirect("/app/team?notice=added");
  }

  const { error } = await db.from("company_invites").insert({
    company_id: access.companyId,
    email,
    invited_by: access.userId,
  });
  if (error) redirect("/app/team?notice=already");
  revalidatePath("/app/settings");
  revalidatePath("/app/team");
  redirect("/app/team?notice=invited");
}

export async function removeCompanyMember(formData: FormData) {
  const access = await currentAccess();
  if (!access?.isOwner || !access.companyId || !access.accessEnabled) return;
  const userId = String(formData.get("user_id") ?? "");
  if (!userId || userId === access.userId) return;
  const db = supabaseAdmin();
  if (!db) return;
  const { data: member } = await db
    .from("company_members")
    .select("user_id")
    .eq("company_id", access.companyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) return;
  await db
    .from("company_members")
    .delete()
    .eq("company_id", access.companyId)
    .eq("user_id", userId);

  const { data: company } = await db
    .from("companies")
    .insert({ name: "", created_by: userId })
    .select("id")
    .single();
  if (company?.id) {
    await db
      .from("profiles")
      .update({ company_id: company.id, account_role: "owner" })
      .eq("user_id", userId);
    await db.from("company_members").upsert({
      company_id: company.id,
      user_id: userId,
      role: "owner",
    });
  }
  revalidatePath("/app/team");
  revalidatePath("/app/settings");
}

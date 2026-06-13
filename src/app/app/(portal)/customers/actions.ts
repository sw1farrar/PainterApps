"use server";

import { revalidatePath } from "next/cache";

import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function createCustomer(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  const companyId = session.company?.id;

  if (!companyId) {
    return { success: false, error: "Company not found." };
  }

  if (!data.name.trim()) {
    return { success: false, error: "Customer name is required." };
  }

  const supabase = await createClient();
  const portalToken = crypto.randomUUID();

  const { error } = await supabase.from("customers").insert({
    company_id: companyId,
    name: data.name.trim(),
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    address: data.address?.trim() || null,
    portal_token: portalToken,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/customers");
  return { success: true };
}

export async function updateCustomer(
  id: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  },
): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  const companyId = session.company?.id;

  if (!companyId) {
    return { success: false, error: "Company not found." };
  }

  if (!data.name.trim()) {
    return { success: false, error: "Customer name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/customers");
  return { success: true };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  const companyId = session.company?.id;

  if (!companyId) {
    return { success: false, error: "Company not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/customers");
  return { success: true };
}
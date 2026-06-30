"use server";

import { revalidatePath } from "next/cache";

import { requireOnboarded } from "@/lib/auth/session";
import { normalizePhoneForStorage } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";

export type CustomerInput = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function normalizeCustomerInput(data: CustomerInput) {
  return {
    name: data.name.trim(),
    email: data.email?.trim() || null,
    phone: normalizePhoneForStorage(data.phone),
    address: data.address?.trim() || null,
    address_line2: data.address_line2?.trim() || null,
    city: data.city?.trim() || null,
    state: data.state?.trim() || null,
    zip: data.zip?.trim() || null,
    notes: data.notes?.trim() || null,
  };
}

export async function createCustomer(
  data: CustomerInput,
): Promise<ActionResult<{ id: string; portal_token: string }>> {
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

  const { data: row, error } = await supabase
    .from("customers")
    .insert({
      company_id: companyId,
      ...normalizeCustomerInput(data),
      portal_token: portalToken,
    })
    .select("id, portal_token")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/customers");
  revalidatePath("/app/quotes");
  return {
    success: true,
    data: { id: row.id, portal_token: row.portal_token },
  };
}

export async function updateCustomer(
  id: string,
  data: CustomerInput,
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
    .update(normalizeCustomerInput(data))
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
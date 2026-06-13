import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import type { Customer } from "@/types/database";
import { CustomersClient } from "./CustomersClient";

export default async function CustomersPage() {
  const session = await requireOnboarded();
  const envError = getSupabaseEnvError();
  const companyId = session.company?.id;

  let customers: Customer[] = [];
  let queryError: string | null = null;

  if (!envError && companyId) {
    const result = await fetchCustomers(companyId);
    if ("error" in result && result.error) {
      queryError = result.error;
    } else if ("data" in result) {
      customers = result.data ?? [];
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      {queryError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {queryError}
        </p>
      ) : null}
      <CustomersClient customers={customers} />
    </div>
  );
}

async function fetchCustomers(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}
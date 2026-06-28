import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { QuoteBuilder } from "@/components/quotes/QuoteBuilder";

export default async function NewQuotePage() {
  const { company } = await requireOnboarded();
  const supabase = await createClient();

  const [{ data: customers }, { data: upgradeRules }] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("company_id", company!.id)
      .order("name"),
    supabase
      .from("quote_upgrade_rules")
      .select("*")
      .eq("company_id", company!.id)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto min-w-0 max-w-5xl">
      <QuoteBuilder
        mode="create"
        customers={customers ?? []}
        company={company!}
        upgradeRules={upgradeRules}
      />
    </div>
  );
}
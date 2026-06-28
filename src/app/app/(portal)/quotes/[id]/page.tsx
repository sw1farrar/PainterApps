import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { QuoteBuilder } from "@/components/quotes/QuoteBuilder";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditQuotePage({ params }: PageProps) {
  const { id } = await params;
  const { company } = await requireOnboarded();
  const supabase = await createClient();

  const [
    { data: quote },
    { data: rooms },
    { data: lineItems },
    { data: tiers },
    { data: customers },
    { data: upgradeRules },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .eq("company_id", company!.id)
      .single(),
    supabase.from("quote_rooms").select("*").eq("quote_id", id),
    supabase.from("quote_line_items").select("*").eq("quote_id", id),
    supabase.from("quote_tiers").select("*").eq("quote_id", id),
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

  if (!quote) notFound();

  return (
    <div className="mx-auto min-w-0 max-w-5xl">
      <QuoteBuilder
        mode="edit"
        quote={quote}
        rooms={rooms ?? []}
        lineItems={lineItems ?? []}
        tiers={tiers ?? []}
        customers={customers ?? []}
        company={company!}
        upgradeRules={upgradeRules}
      />
    </div>
  );
}
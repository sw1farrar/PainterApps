import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SimpleQuoteBuilder } from "@/components/quotes/simple/SimpleQuoteBuilder";
import { loadCompanyPaintProducts } from "@/lib/paint-library/load-company-paint-products";
import { collectEstimateDefaultsProductIds } from "@/lib/quotes/company-estimate-defaults";
import { loadCompanyEstimateDefaults } from "@/lib/quotes/load-company-estimate-defaults";

export default async function NewQuotePage() {
  const { company } = await requireOnboarded();
  const supabase = await createClient();

  const [{ data: customers }, estimateDefaults] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("company_id", company!.id)
      .order("name"),
    loadCompanyEstimateDefaults(company!),
  ]);

  const referencedProductIds = collectEstimateDefaultsProductIds(estimateDefaults);

  const paintProducts = await loadCompanyPaintProducts({
    companyId: company!.id,
    activeOnly: true,
    referencedProductIds,
  });

  return (
    <SimpleQuoteBuilder
      mode="create"
      customers={customers ?? []}
      company={company!}
      paintProducts={paintProducts ?? []}
      estimateDefaults={estimateDefaults}
    />
  );
}
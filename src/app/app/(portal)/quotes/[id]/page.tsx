import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SimpleQuoteBuilder } from "@/components/quotes/simple/SimpleQuoteBuilder";
import { loadCompanyPaintProducts } from "@/lib/paint-library/load-company-paint-products";
import { extractReferencedProductIdsFromQuoteData } from "@/lib/paint-library/quote-product-refs";
import { collectEstimateDefaultsProductIds } from "@/lib/quotes/company-estimate-defaults";
import { loadCompanyEstimateDefaults } from "@/lib/quotes/load-company-estimate-defaults";

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
    { data: surfaces },
    { data: lineItems },
    { data: tiers },
    { data: customers },
    { data: paintDefaults },
    { data: baselinePaintSystems },
    { data: tierPaintConfig },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .eq("company_id", company!.id)
      .single(),
    supabase
      .from("quote_rooms")
      .select("*")
      .eq("quote_id", id)
      .order("sort_order"),
    supabase.from("quote_surfaces").select("*").eq("quote_id", id),
    supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", id)
      .order("sort_order"),
    supabase.from("quote_tiers").select("*").eq("quote_id", id),
    supabase
      .from("customers")
      .select(
        "id, company_id, name, email, phone, address, address_line2, city, state, zip, notes, portal_token, created_at",
      )
      .eq("company_id", company!.id)
      .order("name"),
    supabase.from("quote_paint_defaults").select("*").eq("quote_id", id),
    supabase.from("quote_baseline_paint_systems").select("*").eq("quote_id", id),
    supabase.from("quote_tier_paint_config").select("*").eq("quote_id", id),
  ]);

  if (!quote) notFound();

  const [estimateDefaults, quoteReferencedProductIds] = await Promise.all([
    loadCompanyEstimateDefaults(company!),
    Promise.resolve(
      extractReferencedProductIdsFromQuoteData({
        lineItems,
        surfaces,
        paintDefaults,
        tierPaintConfig,
        baselineSystems: baselinePaintSystems,
      }),
    ),
  ]);

  const referencedProductIds = [
    ...new Set([
      ...quoteReferencedProductIds,
      ...collectEstimateDefaultsProductIds(estimateDefaults),
    ]),
  ];

  const paintProducts = await loadCompanyPaintProducts({
    companyId: company!.id,
    referencedProductIds,
    activeOnly: true,
  });

  return (
    <SimpleQuoteBuilder
      mode="edit"
      quote={quote}
      rooms={rooms ?? []}
      surfaces={surfaces ?? []}
      lineItems={lineItems ?? []}
      tiers={tiers ?? []}
      customers={customers ?? []}
      company={company!}
      paintProducts={paintProducts}
      paintDefaults={paintDefaults ?? []}
      baselinePaintSystems={baselinePaintSystems ?? []}
      tierPaintConfig={tierPaintConfig ?? []}
      estimateDefaults={estimateDefaults}
    />
  );
}
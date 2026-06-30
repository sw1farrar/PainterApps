import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalQuoteView } from "@/components/quotes/PortalQuoteView";
import { buildTierPaintSummaries } from "@/lib/paint-library/tier-display";
import { QUOTE_PAINT_TIERS, type TierPaintConfigInput } from "@/lib/paint-library/types";
import type {
  Company,
  Customer,
  Quote,
  QuoteLineItem,
  QuoteRoom,
  QuoteTier,
  QuoteTierPaintConfig,
} from "@/types/database";

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ portal_token?: string }>;
};

function mapTierPaintConfig(row: QuoteTierPaintConfig): TierPaintConfigInput {
  return {
    tier: row.tier as TierPaintConfigInput["tier"],
    primer_product_id: row.primer_product_id,
    topcoat_product_id: row.topcoat_product_id,
    primer_coats: row.primer_coats,
    topcoat_coats: row.topcoat_coats,
    primer_spot_prime: row.primer_spot_prime ?? false,
    labor_hours_delta_pct: row.labor_hours_delta_pct,
    labor_hours_delta_hours: row.labor_hours_delta_hours,
    prep_hours_delta: row.prep_hours_delta,
    value_add_features: row.value_add_features ?? [],
  };
}

export default async function PortalQuotePage({
  params,
  searchParams,
}: PageProps) {
  const { slug, id } = await params;
  const { portal_token: portalToken } = await searchParams;

  if (!portalToken) notFound();

  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!company) notFound();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, customers(*)")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (!quote) notFound();

  const customer = (quote as Quote & { customers: Customer }).customers;

  if (!customer || customer.portal_token !== portalToken) notFound();

  const [
    { data: tiers },
    { data: optionalItems },
    { data: rooms },
    { data: paintConfig },
  ] = await Promise.all([
    supabase
      .from("quote_tiers")
      .select("*")
      .eq("quote_id", id)
      .order("price"),
    supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", id)
      .eq("is_optional", true),
    supabase
      .from("quote_rooms")
      .select("*")
      .eq("quote_id", id)
      .order("sort_order"),
    supabase
      .from("quote_tier_paint_config")
      .select("*")
      .eq("quote_id", id)
      .in("tier", [...QUOTE_PAINT_TIERS]),
  ]);

  const paintConfigs = ((paintConfig ?? []) as QuoteTierPaintConfig[]).map(
    mapTierPaintConfig,
  );

  const productIds = new Set<string>();
  for (const config of paintConfigs) {
    if (config.primer_product_id) productIds.add(config.primer_product_id);
    if (config.topcoat_product_id) productIds.add(config.topcoat_product_id);
  }

  const { data: paintProducts } =
    productIds.size > 0
      ? await supabase
          .from("company_paint_products")
          .select("id, name, role, is_self_priming, paint_system_features")
          .eq("company_id", company.id)
          .in("id", [...productIds])
      : { data: [] };

  const tierPaintSummaries = buildTierPaintSummaries(
    paintConfigs,
    paintProducts ?? [],
  );

  const visibleTiers = ((tiers ?? []) as QuoteTier[]).filter((tier) =>
    QUOTE_PAINT_TIERS.includes(tier.tier as (typeof QUOTE_PAINT_TIERS)[number]),
  );

  return (
    <div className="portal-shell site-viewport-shell min-h-0">
      <div
        data-site-scroll-main
        className="site-scroll-main mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-16"
      >
        <PortalQuoteView
          quote={quote as Quote}
          tiers={visibleTiers}
          rooms={(rooms ?? []) as QuoteRoom[]}
          optionalItems={(optionalItems ?? []) as QuoteLineItem[]}
          tierPaintSummaries={tierPaintSummaries}
          companyName={(company as Company).name}
          companyLogoUrl={(company as Company).logo_url}
          companyPhone={(company as Company).phone}
          companyEmail={(company as Company).email}
          customerName={customer.name}
          portalToken={portalToken}
        />
      </div>
    </div>
  );
}
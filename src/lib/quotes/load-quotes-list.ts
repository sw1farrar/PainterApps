import { createClient } from "@/lib/supabase/server";
import type { QuoteListCard } from "@/components/quotes/QuotesHub";
import type { JobAddressFields } from "@/lib/address";
import {
  collectQuoteProductIds,
  formatAreaSummary,
  formatProductSummary,
  type QuoteListRoom,
  type QuoteListTierPaintConfig,
} from "@/lib/quotes/quote-list-summary";
import type { QuoteStatus } from "@/types/database";

type RawQuoteListRow = JobAddressFields & {
  id: string;
  name: string | null;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  customers: { name: string } | null;
  quote_tiers: { price: number; tier: string }[] | null;
  quote_rooms: QuoteListRoom[] | null;
  quote_tier_paint_config: QuoteListTierPaintConfig[] | null;
};

export async function loadQuotesListCards(
  companyId: string,
): Promise<QuoteListCard[]> {
  const supabase = await createClient();

  const { data: quotes, error } = await supabase
    .from("quotes")
    .select(
      `
      id,
      name,
      job_address,
      job_address_line2,
      job_city,
      job_state,
      job_zip,
      status,
      created_at,
      updated_at,
      customers(name),
      quote_tiers(price, tier),
      quote_rooms(name, sort_order),
      quote_tier_paint_config(tier, primer_product_id, topcoat_product_id)
    `,
    )
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rawRows = (quotes ?? []) as unknown as RawQuoteListRow[];
  const productIds = new Set<string>();
  const quoteIds = rawRows.map((quote) => quote.id);

  for (const quote of rawRows) {
    for (const id of collectQuoteProductIds({
      tierPaintConfig: quote.quote_tier_paint_config,
    })) {
      productIds.add(id);
    }
  }

  const [productResult, jobsResult] = await Promise.all([
    productIds.size > 0
      ? supabase
          .from("company_paint_products")
          .select("id, name")
          .eq("company_id", companyId)
          .in("id", [...productIds])
      : Promise.resolve({ data: [], error: null }),
    quoteIds.length > 0
      ? supabase
          .from("jobs")
          .select("quote_id")
          .eq("company_id", companyId)
          .in("quote_id", quoteIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productResult.error) throw new Error(productResult.error.message);
  if (jobsResult.error) throw new Error(jobsResult.error.message);

  const productNameById = new Map<string, string>();
  for (const row of productResult.data ?? []) {
    const name = row.name?.trim();
    if (name) productNameById.set(String(row.id), name);
  }

  const linkedJobQuoteIds = new Set<string>();
  for (const job of jobsResult.data ?? []) {
    if (job.quote_id) linkedJobQuoteIds.add(String(job.quote_id));
  }

  return rawRows.map((quote) => {
    const productNames = collectQuoteProductIds({
      tierPaintConfig: quote.quote_tier_paint_config,
    })
      .map((id) => productNameById.get(id))
      .filter((name): name is string => Boolean(name));

    return {
      id: quote.id,
      name: quote.name,
      status: quote.status,
      created_at: quote.created_at,
      updated_at: quote.updated_at,
      job_address: quote.job_address,
      job_address_line2: quote.job_address_line2,
      job_city: quote.job_city,
      job_state: quote.job_state,
      job_zip: quote.job_zip,
      customers: quote.customers,
      quote_tiers: quote.quote_tiers,
      areaSummary: formatAreaSummary(quote.quote_rooms ?? []),
      productSummary: formatProductSummary(productNames),
      hasLinkedJob: linkedJobQuoteIds.has(quote.id),
    };
  });
}
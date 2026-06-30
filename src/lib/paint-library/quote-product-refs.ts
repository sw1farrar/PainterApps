import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function addId(ids: Set<string>, value: string | null | undefined) {
  if (value) ids.add(value);
}

/** Product IDs referenced on a quote draft — includes deactivated catalog rows. */
export async function collectQuoteReferencedProductIds(
  supabase: SupabaseClient<Database>,
  quoteId: string,
): Promise<string[]> {
  const [
    { data: lineItems },
    { data: surfaces },
    { data: paintDefaults },
    { data: tierPaintConfig },
    { data: baselineSystems },
  ] = await Promise.all([
    supabase
      .from("quote_line_items")
      .select("company_paint_product_id")
      .eq("quote_id", quoteId),
    supabase
      .from("quote_surfaces")
      .select("company_paint_product_id")
      .eq("quote_id", quoteId),
    supabase
      .from("quote_paint_defaults")
      .select("company_paint_product_id")
      .eq("quote_id", quoteId),
    supabase
      .from("quote_tier_paint_config")
      .select("primer_product_id, topcoat_product_id")
      .eq("quote_id", quoteId),
    supabase
      .from("quote_baseline_paint_systems")
      .select("primer_product_id, topcoat_product_id")
      .eq("quote_id", quoteId),
  ]);

  const ids = new Set<string>();

  for (const row of lineItems ?? []) {
    addId(ids, row.company_paint_product_id);
  }
  for (const row of surfaces ?? []) {
    addId(ids, row.company_paint_product_id);
  }
  for (const row of paintDefaults ?? []) {
    addId(ids, row.company_paint_product_id);
  }
  for (const row of tierPaintConfig ?? []) {
    addId(ids, row.primer_product_id);
    addId(ids, row.topcoat_product_id);
  }
  for (const row of baselineSystems ?? []) {
    addId(ids, row.primer_product_id);
    addId(ids, row.topcoat_product_id);
  }

  return [...ids];
}

type QuoteProductRefSources = {
  lineItems?: Array<{ company_paint_product_id: string | null }> | null;
  surfaces?: Array<{ company_paint_product_id: string | null }> | null;
  paintDefaults?: Array<{ company_paint_product_id: string | null }> | null;
  tierPaintConfig?:
    | Array<{
        primer_product_id: string | null;
        topcoat_product_id: string | null;
      }>
    | null;
  baselineSystems?:
    | Array<{
        primer_product_id: string | null;
        topcoat_product_id: string | null;
      }>
    | null;
};

/** Collect referenced product IDs from quote rows already loaded on the page. */
export function extractReferencedProductIdsFromQuoteData(
  sources: QuoteProductRefSources,
): string[] {
  const ids = new Set<string>();

  for (const row of sources.lineItems ?? []) {
    addId(ids, row.company_paint_product_id);
  }
  for (const row of sources.surfaces ?? []) {
    addId(ids, row.company_paint_product_id);
  }
  for (const row of sources.paintDefaults ?? []) {
    addId(ids, row.company_paint_product_id);
  }
  for (const row of sources.tierPaintConfig ?? []) {
    addId(ids, row.primer_product_id);
    addId(ids, row.topcoat_product_id);
  }
  for (const row of sources.baselineSystems ?? []) {
    addId(ids, row.primer_product_id);
    addId(ids, row.topcoat_product_id);
  }

  return [...ids];
}
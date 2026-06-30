import {
  ensureCompanyPaintProductSchema,
  ensurePaintProductSchema,
} from "@/lib/product-catalog/ensure-schema";
import {
  isCompanyPaintProductAttributesReady,
  isUnifiedCatalogColumnsReady,
} from "@/lib/paint-library/company-paint-product-schema-ready";
import {
  companyPaintCatalogListSelect,
  companyPaintProductSelect,
  isSupabaseMissingColumnError,
  mapCompanyPaintProduct,
  type PlatformPaintProductJoinVariant,
} from "@/lib/paint-library/map-company-paint-product";
import { collectQuoteReferencedProductIds } from "@/lib/paint-library/quote-product-refs";
import { createClient } from "@/lib/supabase/server";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";

type LoadCompanyPaintProductsOptions = {
  companyId: string;
  /** When set, inactive products referenced on this quote are included. */
  quoteId?: string;
  /** Pre-collected product IDs — skips extra DB round-trips when quote data is already loaded. */
  referencedProductIds?: string[];
  /** When true, only active products are returned (plus quote references). */
  activeOnly?: boolean;
  /** Catalog list view omits heavy attribute columns not shown in the table. */
  variant?: "full" | "catalog";
};

type LoadCompanyPaintProductByIdOptions = {
  companyId: string;
  productId: string;
};

function mapRows(rows: Record<string, unknown>[]): CompanyPaintProductRow[] {
  return rows.map((row) => mapCompanyPaintProduct(row));
}

const CATALOG_JOIN_FALLBACK_CHAIN: PlatformPaintProductJoinVariant[] = [
  "unified",
  "attributes",
  "minimal",
];

async function queryCompanyPaintProducts(
  companyId: string,
  select: string,
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_paint_products")
    .select(select)
    .eq("company_id", companyId)
    .order("is_active", { ascending: false })
    .order("sort_order")
    .order("name");

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data ?? []) as unknown as Record<string, unknown>[], error: null };
}

async function loadCatalogCompanyPaintProducts(
  companyId: string,
): Promise<CompanyPaintProductRow[]> {
  await Promise.all([
    ensurePaintProductSchema(),
    ensureCompanyPaintProductSchema(),
  ]);

  const companyAttributesReady = await isCompanyPaintProductAttributesReady();
  const unifiedCatalogReady = await isUnifiedCatalogColumnsReady();

  const joinVariants = CATALOG_JOIN_FALLBACK_CHAIN.filter((variant) => {
    if (variant === "unified") return unifiedCatalogReady;
    return true;
  });

  let lastError: string | null = null;

  for (const joinVariant of joinVariants) {
    const select = companyPaintCatalogListSelect({
      companyAttributesReady,
      joinVariant,
    });
    const { rows, error } = await queryCompanyPaintProducts(companyId, select);

    if (!error) {
      return mapRows(rows);
    }

    lastError = error;
    if (!isSupabaseMissingColumnError(error)) {
      throw new Error(error);
    }
  }

  throw new Error(
    lastError ?? "Failed to load company product catalog.",
  );
}

export async function loadCompanyPaintProductById({
  companyId,
  productId,
}: LoadCompanyPaintProductByIdOptions): Promise<CompanyPaintProductRow | null> {
  const supabase = await createClient();

  let lastError: string | null = null;

  for (const joinVariant of CATALOG_JOIN_FALLBACK_CHAIN) {
    const { data, error } = await supabase
      .from("company_paint_products")
      .select(companyPaintProductSelect(joinVariant))
      .eq("company_id", companyId)
      .eq("id", productId)
      .maybeSingle();

    if (!error && data) {
      return mapCompanyPaintProduct(data as unknown as Record<string, unknown>);
    }

    if (error) {
      lastError = error.message;
      if (!isSupabaseMissingColumnError(error.message)) {
        throw new Error(error.message);
      }
    }
  }

  if (lastError) throw new Error(lastError);
  return null;
}

async function loadAllCompanyPaintProducts(
  companyId: string,
  variant: "full" | "catalog",
): Promise<CompanyPaintProductRow[]> {
  if (variant === "catalog") {
    return loadCatalogCompanyPaintProducts(companyId);
  }

  await ensurePaintProductSchema();

  let lastError: string | null = null;

  for (const joinVariant of CATALOG_JOIN_FALLBACK_CHAIN) {
    const { rows, error } = await queryCompanyPaintProducts(
      companyId,
      companyPaintProductSelect(joinVariant),
    );

    if (!error) {
      return mapRows(rows);
    }

    lastError = error;
    if (!isSupabaseMissingColumnError(error)) {
      throw new Error(error);
    }
  }

  throw new Error(lastError ?? "Failed to load company paint products.");
}

async function loadActiveCompanyPaintProducts(
  companyId: string,
  options?: { quoteId?: string; referencedProductIds?: string[] },
): Promise<CompanyPaintProductRow[]> {
  const supabase = await createClient();

  let lastError: string | null = null;
  let activeRows: Record<string, unknown>[] | null = null;

  for (const joinVariant of CATALOG_JOIN_FALLBACK_CHAIN) {
    const { data, error } = await supabase
      .from("company_paint_products")
      .select(companyPaintProductSelect(joinVariant))
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("sort_order")
      .order("name");

    if (!error) {
      activeRows = (data ?? []) as unknown as Record<string, unknown>[];
      break;
    }

    lastError = error.message;
    if (!isSupabaseMissingColumnError(error.message)) {
      throw new Error(error.message);
    }
  }

  if (!activeRows) {
    throw new Error(lastError ?? "Failed to load active company paint products.");
  }

  const rows: Record<string, unknown>[] = [...activeRows];

  let referencedIds = options?.referencedProductIds;
  if (!referencedIds?.length && options?.quoteId) {
    referencedIds = await collectQuoteReferencedProductIds(
      supabase,
      options.quoteId,
    );
  }

  if (referencedIds?.length) {
    const loadedIds = new Set(rows.map((row) => String(row.id)));
    const missingIds = referencedIds.filter((id) => !loadedIds.has(id));

    if (missingIds.length > 0) {
      const { data: referencedRows, error: referencedError } = await supabase
        .from("company_paint_products")
        .select(companyPaintProductSelect("unified"))
        .eq("company_id", companyId)
        .in("id", missingIds);

      if (referencedError) throw new Error(referencedError.message);
      rows.push(
        ...((referencedRows ?? []) as unknown as Record<string, unknown>[]),
      );
    }
  }

  return mapRows(rows);
}

export async function loadCompanyPaintProducts({
  companyId,
  quoteId,
  referencedProductIds,
  activeOnly = false,
  variant = "full",
}: LoadCompanyPaintProductsOptions): Promise<CompanyPaintProductRow[]> {
  if (!activeOnly) {
    return loadAllCompanyPaintProducts(companyId, variant);
  }

  return loadActiveCompanyPaintProducts(companyId, {
    quoteId,
    referencedProductIds,
  });
}
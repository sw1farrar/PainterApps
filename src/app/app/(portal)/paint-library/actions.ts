"use server";

import { revalidatePath } from "next/cache";
import { buildCompanyProductMarketingSheetPreviewView } from "@/lib/product-catalog/company-product-marketing-sheet";
import { loadCatalogProduct } from "@/lib/product-catalog/load-catalog-product";
import type { ProductMarketingSheetView } from "@/lib/product-catalog/product-marketing-sheet";
import { buildBookmarkPayloadFromCustomSaveInput } from "@/lib/paint-library/company-product-bookmark";
import { isPaintProductDiscontinuedColumnReady } from "@/lib/paint-library/company-paint-product-schema-ready";
import {
  COMPANY_PAINT_PRODUCT_SELECT,
  isSupabaseMissingColumnError,
  mapCompanyPaintProduct,
} from "@/lib/paint-library/map-company-paint-product";
import { normalizeCatalogProductName } from "@/lib/product-catalog/normalize-catalog-product-name";
import { upsertSubscriberPaintProduct } from "@/lib/product-catalog/subscriber-paint-product";
import {
  lookupCustomProductWithAi,
  type CustomProductAiLookupResult,
} from "@/lib/product-catalog/ai-custom-product-lookup";
import { resolveCustomProductCanImageFromManufacturer } from "@/lib/product-catalog/resolve-custom-product-can-image";
import {
  enrichCustomProductFromDataSheet,
  mapDatasheetEnrichmentToSaveInput,
  type CustomProductDatasheetEnrichment,
} from "@/lib/product-catalog/enrich-custom-product-datasheet";
import {
  ensureCompanyPaintProductSchema,
  ensurePaintProductSchema,
} from "@/lib/product-catalog/ensure-schema";
import { persistPlatformPaintCanImageUpload } from "@/lib/product-catalog/persist-platform-can-image";
import { DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON } from "@/lib/paint-library/coverage";
import { loadCompanyPaintProductRowWithFallback } from "@/lib/paint-library/load-company-paint-product-with-fallback";
import {
  buildCompanyPaintProductFromPlatformCatalog,
  buildPlatformImportBookmarkPayload,
} from "@/lib/paint-library/platform-catalog-import";
import { findPlatformProductMatches } from "@/lib/product-catalog/find-platform-product-matches";
import type { PlatformProductMatch } from "@/lib/product-catalog/find-platform-product-matches";
import { resolveCanonicalManufacturerName } from "@/lib/product-catalog/resolve-manufacturer-logo-url";
import type { SaveCustomPaintProductInput } from "@/lib/paint-library/custom-product-form";

import { loadCompanyCatalogManufacturers } from "@/lib/paint-library/load-company-catalog-manufacturers";
import {
  loadCompanyPaintProductById,
  loadCompanyPaintProducts,
} from "@/lib/paint-library/load-company-paint-products";
import { requireOnboarded } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getXaiEnvError } from "@/lib/xai/env";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import {
  companyProductCanImageStoragePath,
  getCompanyProductCanImagePublicUrl,
  isCompanyProductCanStoragePath,
  validateCompanyProductCanImageFile,
} from "@/lib/storage/company-product-can-image";
import type {
  CompanyPaintProduct,
  CompanyPaintProductRole,
  PaintProductApplication,
  PaintProductCategory,
  PaintProductSource,
  QuoteTierName,
} from "@/types/database";
import type {
  CompanyPaintPresetRow,
  CompanyPaintProductRow,
  TierPaintConfigInput,
} from "@/lib/paint-library/types";
import { QUOTE_PAINT_TIERS } from "@/lib/paint-library/types";
import type { CatalogProductRow } from "@/lib/product-catalog/types";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function parseFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function mapPreset(row: Record<string, unknown>): CompanyPaintPresetRow {
  return {
    id: String(row.id),
    company_id: String(row.company_id),
    name: String(row.name ?? ""),
    application_type: String(row.application_type ?? "interior"),
    description: row.description ? String(row.description) : null,
    primer_product_id: row.primer_product_id ? String(row.primer_product_id) : null,
    topcoat_product_id: row.topcoat_product_id ? String(row.topcoat_product_id) : null,
    primer_coats: Number(row.primer_coats ?? 1),
    topcoat_coats: Number(row.topcoat_coats ?? 2),
    labor_hours_delta_pct: Number(row.labor_hours_delta_pct ?? 0),
    labor_hours_delta_hours: Number(row.labor_hours_delta_hours ?? 0),
    prep_hours_delta: Number(row.prep_hours_delta ?? 0),
    value_add_features: parseFeatures(row.value_add_features),
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

const PRODUCT_CATALOG_PATHS = [
  "/app/products/catalog",
  "/app/settings/paint-library",
] as const;

function revalidateProductCatalogPaths() {
  for (const path of PRODUCT_CATALOG_PATHS) {
    revalidatePath(path);
  }
}

export async function listCompanyPaintProducts(
  quoteId?: string,
): Promise<ActionResult<CompanyPaintProductRow[]>> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const data = await loadCompanyPaintProducts({
      companyId: company.id,
      quoteId,
      activeOnly: true,
    });

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load products",
    };
  }
}

export async function listCompanyPaintCatalog(): Promise<
  ActionResult<CompanyPaintProductRow[]>
> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    await Promise.all([
      ensurePaintProductSchema(),
      ensureCompanyPaintProductSchema(),
    ]);

    const data = await loadCompanyPaintProducts({
      companyId: company.id,
      activeOnly: false,
      variant: "catalog",
    });

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load catalog",
    };
  }
}

export async function listCompanyCatalogManufacturers(): Promise<
  ActionResult<string[]>
> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const data = await loadCompanyCatalogManufacturers(company.id);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to load manufacturers",
    };
  }
}

export async function getCompanyPaintProduct(
  productId: string,
): Promise<ActionResult<CompanyPaintProductRow>> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const data = await loadCompanyPaintProductById({
      companyId: company.id,
      productId,
    });

    if (!data) {
      return { success: false, error: "Product not found" };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load product",
    };
  }
}

export async function getCompanyProductMarketingSheetView(
  productId: string,
): Promise<ActionResult<ProductMarketingSheetView>> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const product = await loadCompanyPaintProductById({
      companyId: company.id,
      productId,
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const view = await buildCompanyProductMarketingSheetPreviewView(product);
    return { success: true, data: view };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to load marketing sheet",
    };
  }
}

/** Resolves manufacturer logo server-side; reuses catalog row data from the client. */
export async function enrichCompanyProductMarketingSheetView(
  product: CompanyPaintProductRow,
): Promise<ActionResult<ProductMarketingSheetView>> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };
    if (product.company_id !== company.id) {
      return { success: false, error: "Product not found" };
    }

    const view = await buildCompanyProductMarketingSheetPreviewView(product);
    return { success: true, data: view };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to load marketing sheet",
    };
  }
}

export type CatalogProductBrowseRow = {
  id: string;
  name: string;
  manufacturer_name: string;
  category: string;
  application_type: string;
  base_type: string | null;
  sheen: string | null;
  is_self_priming: boolean;
  paint_system_features: string[];
  coverage_sqft_per_gallon: number;
};

export type BrowseCatalogProductsInput = {
  query?: string;
  manufacturer?: string;
  category?: string;
  applicationType?: string;
  selfPriming?: boolean;
};

/** Shared platform metadata only — never includes company-specific unit_cost. */
export async function browseCatalogProducts(
  input?: string | BrowseCatalogProductsInput,
): Promise<ActionResult<CatalogProductBrowseRow[]>> {
  try {
    await requireOnboarded();
    await ensurePaintProductSchema();
    const supabase = await createClient();
    const filters =
      typeof input === "string" ? { query: input } : (input ?? {});

    const discontinuedReady = await isPaintProductDiscontinuedColumnReady();
    const select =
      "id, name, category, application_type, base_type, sheens, is_self_priming, paint_system_features, coverage_sqft_per_gallon, paint_manufacturers(name)";

    const runBrowseQuery = async (filterDiscontinued: boolean) => {
      let builder = supabase
        .from("paint_products")
        .select(select)
        .order("name")
        .limit(200);

      if (filterDiscontinued) {
        builder = builder.eq("is_discontinued", false);
      }

      if (filters.query?.trim()) {
        builder = builder.ilike("name", `%${filters.query.trim()}%`);
      }

      if (filters.category && filters.category !== "all") {
        builder = builder.eq(
          "category",
          filters.category as PaintProductCategory,
        );
      }

      if (filters.applicationType && filters.applicationType !== "all") {
        builder = builder.eq(
          "application_type",
          filters.applicationType as PaintProductApplication,
        );
      }

      if (filters.selfPriming === true) {
        builder = builder.eq("is_self_priming", true);
      } else if (filters.selfPriming === false) {
        builder = builder.eq("is_self_priming", false);
      }

      return builder;
    };

    let { data, error } = await runBrowseQuery(discontinuedReady);
    if (
      error &&
      discontinuedReady &&
      isSupabaseMissingColumnError(error.message)
    ) {
      ({ data, error } = await runBrowseQuery(false));
    }
    if (error) return { success: false, error: error.message };

    let rows = (data ?? []).map((row) => {
      const mfr = row.paint_manufacturers as { name?: string } | null;
      return {
        id: String(row.id),
        name: String(row.name),
        manufacturer_name: mfr?.name ?? "Unknown",
        category: String(row.category),
        application_type: String(row.application_type),
        base_type: row.base_type ? String(row.base_type) : null,
        sheen: Array.isArray(row.sheens) && row.sheens.length
          ? row.sheens.map(String).join(", ")
          : null,
        is_self_priming: Boolean(row.is_self_priming),
        paint_system_features: parseFeatures(row.paint_system_features),
        coverage_sqft_per_gallon:
          row.coverage_sqft_per_gallon != null
            ? Number(row.coverage_sqft_per_gallon)
            : DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
      };
    });

    if (filters.manufacturer && filters.manufacturer !== "all") {
      const manufacturer = filters.manufacturer.toLowerCase();
      rows = rows.filter((row) =>
        row.manufacturer_name.toLowerCase().includes(manufacturer),
      );
    }

    return { success: true, data: rows };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to browse catalog",
    };
  }
}

export async function loadPlatformCatalogProduct(
  paintProductId: string,
): Promise<ActionResult<CatalogProductRow>> {
  try {
    await requireOnboarded();
    const result = await loadCatalogProduct(paintProductId);
    if ("error" in result) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load product",
    };
  }
}

export async function listCatalogManufacturers(): Promise<ActionResult<string[]>> {
  try {
    await requireOnboarded();
    await ensurePaintProductSchema();
    const supabase = await createClient();
    const discontinuedReady = await isPaintProductDiscontinuedColumnReady();

    let query = supabase.from("paint_products").select("paint_manufacturers(name)");
    if (discontinuedReady) {
      query = query.eq("is_discontinued", false);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const names = new Set<string>();
    for (const row of data ?? []) {
      const manufacturer = row.paint_manufacturers as { name?: string } | null;
      const name = manufacturer?.name?.trim();
      if (name) names.add(name);
    }

    return {
      success: true,
      data: Array.from(names).sort((a, b) => a.localeCompare(b)),
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to load manufacturers",
    };
  }
}

export async function importCatalogProduct(input: {
  paintProductId: string;
  unitCost: number;
  coverageSqftPerGallon?: number;
}): Promise<ActionResult<CompanyPaintProductRow>> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    await ensureCompanyPaintProductSchema();

    const catalogResult = await loadCatalogProduct(input.paintProductId);
    if ("error" in catalogResult) {
      return { success: false, error: catalogResult.error };
    }

    const supabase = await createClient();
    const coverage =
      input.coverageSqftPerGallon ??
      catalogResult.coverage_sqft_per_gallon ??
      DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON;

    const bookmarkPayload = buildPlatformImportBookmarkPayload(catalogResult, {
      unitCost: input.unitCost,
      coverageSqftPerGallon: coverage,
    });

    const { data: existing, error: existingError } = await supabase
      .from("company_paint_products")
      .select("id")
      .eq("company_id", company.id)
      .eq("paint_product_id", input.paintProductId)
      .maybeSingle();

    if (existingError) {
      return { success: false, error: existingError.message };
    }

    let bookmarkId: string | null = existing?.id ? String(existing.id) : null;
    let saveError: { message: string; code?: string } | null = null;

    if (bookmarkId) {
      const result = await supabase
        .from("company_paint_products")
        .update(bookmarkPayload as never)
        .eq("id", bookmarkId)
        .eq("company_id", company.id)
        .select("id")
        .single();

      saveError = result.error;
    } else {
      const result = await supabase
        .from("company_paint_products")
        .insert(
          buildCompanyPaintProductFromPlatformCatalog(catalogResult, {
            companyId: company.id,
            unitCost: input.unitCost,
            coverageSqftPerGallon: coverage,
          }) as never,
        )
        .select("id")
        .single();

      bookmarkId = result.data?.id ? String(result.data.id) : null;
      saveError = result.error;
    }

    if (saveError) {
      if (saveError.code === "23505") {
        const { data: duplicateBookmark } = await supabase
          .from("company_paint_products")
          .select("id")
          .eq("company_id", company.id)
          .eq("paint_product_id", input.paintProductId)
          .maybeSingle();

        if (duplicateBookmark?.id) {
          bookmarkId = String(duplicateBookmark.id);
          const retry = await supabase
            .from("company_paint_products")
            .update(bookmarkPayload as never)
            .eq("id", bookmarkId)
            .eq("company_id", company.id)
            .select("id")
            .single();

          if (retry.error) {
            return { success: false, error: retry.error.message };
          }
        } else {
          return { success: false, error: saveError.message };
        }
      } else {
        return { success: false, error: saveError.message };
      }
    }

    if (!bookmarkId) {
      return { success: false, error: "Failed to save product" };
    }

    const savedRow = await loadCompanyPaintProductRowWithFallback({
      supabase,
      companyId: company.id,
      bookmarkId,
      catalogFallback: catalogResult,
    });

    revalidateProductCatalogPaths();
    return {
      success: true,
      data: savedRow,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to import product",
    };
  }
}

export async function resolveCatalogManufacturerName(
  manufacturerName: string,
): Promise<
  ActionResult<{ canonicalName: string; wasMatched: boolean }>
> {
  try {
    await requireOnboarded();
    const result = await resolveCanonicalManufacturerName(manufacturerName);
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to resolve manufacturer",
    };
  }
}

export async function checkCustomProductPlatformMatches(input: {
  manufacturerName: string;
  productName: string;
}): Promise<ActionResult<{ matches: PlatformProductMatch[] }>> {
  try {
    await requireOnboarded();

    const { canonicalName } = await resolveCanonicalManufacturerName(
      input.manufacturerName,
    );

    const matches = await findPlatformProductMatches({
      manufacturerName: canonicalName,
      productName: input.productName.trim(),
      limit: 3,
    });

    return { success: true, data: { matches } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to check platform catalog",
    };
  }
}

export async function enrichCustomProductDatasheet(input: {
  manufacturerName: string;
  productName: string;
  applicationType: "interior" | "exterior" | "both";
}): Promise<
  ActionResult<{
    enrichment: CustomProductDatasheetEnrichment;
    suggestedAttributes: Partial<SaveCustomPaintProductInput>;
  }>
> {
  try {
    await requireOnboarded();
    const xaiError = getXaiEnvError();
    if (xaiError) return { success: false, error: xaiError };

    const { canonicalName } = await resolveCanonicalManufacturerName(
      input.manufacturerName,
    );

    const result = await enrichCustomProductFromDataSheet({
      manufacturerName: canonicalName,
      productName: input.productName.trim(),
      scopeHint: input.applicationType,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        enrichment: result.data,
        suggestedAttributes: mapDatasheetEnrichmentToSaveInput(result.data, {
          manufacturerName: canonicalName,
          productName: input.productName.trim(),
        }),
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to read product data sheet",
    };
  }
}

export async function runCustomProductAiLookup(input: {
  manufacturerName: string;
  productName: string;
  applicationType: "interior" | "exterior" | "both";
}): Promise<ActionResult<CustomProductAiLookupResult>> {
  try {
    await requireOnboarded();
    const xaiError = getXaiEnvError();
    if (xaiError) return { success: false, error: xaiError };

    const result = await lookupCustomProductWithAi(input);
    if (result.status === "error") {
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "AI lookup failed",
    };
  }
}

export async function fetchCustomProductCanImageFromManufacturer(input: {
  manufacturerName: string;
  productName: string;
  applicationType: "interior" | "exterior" | "both";
  productPageUrl?: string | null;
}): Promise<
  ActionResult<{
    canImageUrl: string;
    previewDataUrl: string;
    sourceUrl: string | null;
  }>
> {
  try {
    await requireOnboarded();
    const xaiError = getXaiEnvError();
    if (xaiError) return { success: false, error: xaiError };

    const result = await resolveCustomProductCanImageFromManufacturer(input);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        canImageUrl: result.canImageUrl,
        previewDataUrl: result.previewDataUrl,
        sourceUrl: result.sourceUrl,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to load paint can image from manufacturer site",
    };
  }
}

async function removeCompanyProductCanImageFile(
  companyId: string,
  storagePath: string | null | undefined,
): Promise<void> {
  if (!isCompanyProductCanStoragePath(companyId, storagePath)) return;

  const admin = createAdminClient();
  await admin.storage
    .from(STORAGE_BUCKETS.productCatalogAssets)
    .remove([storagePath!]);
}

export async function uploadPlatformPaintProductCanImage(
  formData: FormData,
): Promise<
  ActionResult<{ url: string; storagePath: string; updatedAt: string }>
> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const file = formData.get("file");
    const paintProductId = String(formData.get("paintProductId") ?? "").trim();

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Choose an image to upload." };
    }
    if (!paintProductId) {
      return { success: false, error: "Product id is required." };
    }

    const supabase = await createClient();
    const { data: bookmark, error: bookmarkError } = await supabase
      .from("company_paint_products")
      .select("id")
      .eq("company_id", company.id)
      .eq("paint_product_id", paintProductId)
      .maybeSingle();

    if (bookmarkError || !bookmark) {
      return {
        success: false,
        error: "Add this product to your catalog before uploading a can image.",
      };
    }

    const result = await persistPlatformPaintCanImageUpload({
      paintProductId,
      file,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidateProductCatalogPaths();
    revalidatePath("/app/admin/product-catalog");

    return {
      success: true,
      data: {
        url: result.url,
        storagePath: result.storagePath,
        updatedAt: result.updatedAt,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to upload can image.",
    };
  }
}

export async function uploadCompanyProductCanImage(
  formData: FormData,
): Promise<ActionResult<{ url: string; storagePath: string }>> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Choose an image to upload." };
    }

    const validationError = validateCompanyProductCanImageFile(file);
    if (validationError) return { success: false, error: validationError };

    const productId = String(formData.get("productId") ?? "").trim() || null;
    const path = companyProductCanImageStoragePath(company.id, productId, file);
    const buffer = Buffer.from(await file.arrayBuffer());

    const admin = createAdminClient();
    const { error } = await admin.storage
      .from(STORAGE_BUCKETS.productCatalogAssets)
      .upload(path, buffer, { upsert: true, contentType: file.type });

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        url: getCompanyProductCanImagePublicUrl(path),
        storagePath: path,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to upload can image.",
    };
  }
}

export async function saveCustomPaintProduct(
  input: SaveCustomPaintProductInput,
): Promise<ActionResult<CompanyPaintProductRow>> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };
    if (!input.name.trim()) return { success: false, error: "Name is required" };

    await ensureCompanyPaintProductSchema();

    const supabase = await createClient();

    let saveInput = input;
    if (input.manufacturerName?.trim()) {
      const { canonicalName } = await resolveCanonicalManufacturerName(
        input.manufacturerName,
      );
      saveInput = { ...input, manufacturerName: canonicalName };
    }

    let linkedPaintProductId: string | null = null;
    if (input.id) {
      const { data: existingBookmark, error: existingError } = await supabase
        .from("company_paint_products")
        .select("id, paint_product_id")
        .eq("id", input.id)
        .eq("company_id", company.id)
        .maybeSingle();

      if (existingError || !existingBookmark) {
        return { success: false, error: "Product not found" };
      }

      linkedPaintProductId = existingBookmark.paint_product_id
        ? String(existingBookmark.paint_product_id)
        : null;
    }

    const { paintProductId } = await upsertSubscriberPaintProduct({
      saveInput,
      companyId: company.id,
      linkedPaintProductId,
    });

    const bookmarkPayload = {
      ...buildBookmarkPayloadFromCustomSaveInput(
        paintProductId,
        saveInput,
        company.coverage_sqft_per_gallon,
      ),
      is_active: true,
    };

    let bookmarkId = input.id ?? null;
    let saveError: { message: string; code?: string } | null = null;

    if (input.id) {
      const result = await supabase
        .from("company_paint_products")
        .update(bookmarkPayload as never)
        .eq("id", input.id)
        .eq("company_id", company.id)
        .select("id")
        .single();

      bookmarkId = result.data?.id ? String(result.data.id) : bookmarkId;
      saveError = result.error;
    } else {
      const { data: existingBookmark } = await supabase
        .from("company_paint_products")
        .select("id")
        .eq("company_id", company.id)
        .eq("paint_product_id", paintProductId)
        .maybeSingle();

      if (existingBookmark?.id) {
        bookmarkId = String(existingBookmark.id);
        const result = await supabase
          .from("company_paint_products")
          .update(bookmarkPayload as never)
          .eq("id", existingBookmark.id)
          .eq("company_id", company.id)
          .select("id")
          .single();

        saveError = result.error;
      } else {
        const result = await supabase
          .from("company_paint_products")
          .insert({
            company_id: company.id,
            ...bookmarkPayload,
          } as never)
          .select("id")
          .single();

        bookmarkId = result.data?.id ? String(result.data.id) : null;
        saveError = result.error;
      }
    }

    if (saveError) {
      if (
        saveError.code === "23505" &&
        !input.id
      ) {
        const { data: existingBookmark } = await supabase
          .from("company_paint_products")
          .select("id")
          .eq("company_id", company.id)
          .eq("paint_product_id", paintProductId)
          .maybeSingle();

        if (existingBookmark?.id) {
          bookmarkId = String(existingBookmark.id);
          const retry = await supabase
            .from("company_paint_products")
            .update(bookmarkPayload as never)
            .eq("id", existingBookmark.id)
            .eq("company_id", company.id)
            .select("id")
            .single();

          if (retry.error) {
            return { success: false, error: retry.error.message };
          }
        } else {
          return { success: false, error: saveError.message };
        }
      } else {
        return { success: false, error: saveError.message };
      }
    }

    if (!bookmarkId) {
      return { success: false, error: "Failed to save product" };
    }

    const savedRow = await loadCompanyPaintProductRowWithFallback({
      supabase,
      companyId: company.id,
      bookmarkId,
      minimalFallback: {
        paintProductId,
        name: normalizeCatalogProductName(saveInput.name),
        manufacturerName: saveInput.manufacturerName,
        applicationType: saveInput.applicationType,
      },
    });

    revalidateProductCatalogPaths();
    return {
      success: true,
      data: savedRow,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save product",
    };
  }
}

export async function updateCompanyProductUnitCost(
  productId: string,
  unitCost: number,
): Promise<ActionResult<CompanyPaintProductRow>> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const normalizedCost = Number.isFinite(unitCost) ? Math.max(0, unitCost) : 0;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_paint_products")
      .update({
        unit_cost: normalizedCost,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("company_id", company.id)
      .select(COMPANY_PAINT_PRODUCT_SELECT)
      .single();

    if (error) return { success: false, error: error.message };
    const row = data as unknown as Record<string, unknown> | null;
    if (!row || String(row.company_id) !== company.id) {
      return { success: false, error: "Product not found" };
    }

    revalidateProductCatalogPaths();
    return {
      success: true,
      data: mapCompanyPaintProduct(row),
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to update unit cost",
    };
  }
}

export async function listPaintPresets(): Promise<
  ActionResult<CompanyPaintPresetRow[]>
> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_paint_presets")
      .select("*")
      .eq("company_id", company.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("name");

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((row) => mapPreset(row as Record<string, unknown>)),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load presets",
    };
  }
}

export async function savePaintPreset(input: {
  id?: string;
  name: string;
  applicationType?: string;
  description?: string;
  primerProductId?: string | null;
  topcoatProductId?: string | null;
  primerCoats?: number;
  topcoatCoats?: number;
  laborHoursDeltaPct?: number;
  laborHoursDeltaHours?: number;
  prepHoursDelta?: number;
  valueAddFeatures?: string[];
}): Promise<ActionResult<CompanyPaintPresetRow>> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };
    if (!input.name.trim()) return { success: false, error: "Name is required" };

    const supabase = await createClient();
    const payload = {
      company_id: company.id,
      name: input.name.trim(),
      application_type: input.applicationType ?? "interior",
      description: input.description?.trim() || null,
      primer_product_id: input.primerProductId || null,
      topcoat_product_id: input.topcoatProductId || null,
      primer_coats: input.primerCoats ?? 1,
      topcoat_coats: input.topcoatCoats ?? 2,
      labor_hours_delta_pct: input.laborHoursDeltaPct ?? 0,
      labor_hours_delta_hours: input.laborHoursDeltaHours ?? 0,
      prep_hours_delta: input.prepHoursDelta ?? 0,
      value_add_features: input.valueAddFeatures ?? [],
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = input.id
      ? await supabase
          .from("company_paint_presets")
          .update(payload)
          .eq("id", input.id)
          .eq("company_id", company.id)
          .select("*")
          .single()
      : await supabase
          .from("company_paint_presets")
          .insert(payload)
          .select("*")
          .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/settings/paint-library");
    return {
      success: true,
      data: mapPreset(data as Record<string, unknown>),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save preset",
    };
  }
}

export async function fetchCompanyTierDefaults(): Promise<
  ActionResult<TierPaintConfigInput[]>
> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_tier_defaults")
      .select("*")
      .eq("company_id", company.id);

    if (error) return { success: false, error: error.message };

    const byTier = new Map(
      (data ?? []).map((row) => [String(row.tier), row]),
    );

    const configs: TierPaintConfigInput[] = QUOTE_PAINT_TIERS.map((tier) => {
      const row = byTier.get(tier);
      if (!row) {
        return {
          tier,
          primer_product_id: null,
          topcoat_product_id: null,
          primer_coats: 1,
          topcoat_coats: 2,
          primer_spot_prime: false,
          labor_hours_delta_pct: 0,
          labor_hours_delta_hours: 0,
          prep_hours_delta: 0,
          value_add_features: [],
        };
      }
      return {
        tier,
        primer_product_id: row.primer_product_id ? String(row.primer_product_id) : null,
        topcoat_product_id: row.topcoat_product_id ? String(row.topcoat_product_id) : null,
        primer_coats: Number(row.primer_coats ?? 1),
        topcoat_coats: Number(row.topcoat_coats ?? 2),
        primer_spot_prime: false,
        labor_hours_delta_pct: Number(row.labor_hours_delta_pct ?? 0),
        labor_hours_delta_hours: Number(row.labor_hours_delta_hours ?? 0),
        prep_hours_delta: Number(row.prep_hours_delta ?? 0),
        value_add_features: parseFeatures(row.value_add_features),
      };
    });

    return { success: true, data: configs };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load tier defaults",
    };
  }
}

export async function deactivatePaintProduct(id: string): Promise<ActionResult> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const supabase = await createClient();
    // Soft-deactivate only — preserves FK links and pricing on existing quotes.
    const { error } = await supabase
      .from("company_paint_products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) return { success: false, error: error.message };

    revalidateProductCatalogPaths();
    revalidatePath("/app/settings");
    revalidatePath("/app/quotes", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove product",
    };
  }
}

export async function deactivatePaintPreset(id: string): Promise<ActionResult> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("company_paint_presets")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/settings");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove preset",
    };
  }
}

export async function saveCompanyTierDefaults(
  configs: TierPaintConfigInput[],
): Promise<ActionResult> {
  try {
    const { company } = await requireOnboarded();
    if (!company) return { success: false, error: "Company not found" };

    const supabase = await createClient();
    for (const config of configs) {
      if (!QUOTE_PAINT_TIERS.includes(config.tier)) continue;
      const payload = {
        company_id: company.id,
        tier: config.tier as QuoteTierName,
        application_scope: "interior",
        primer_product_id: config.primer_product_id,
        topcoat_product_id: config.topcoat_product_id,
        primer_coats: config.primer_coats,
        topcoat_coats: config.topcoat_coats,
        labor_hours_delta_pct: config.labor_hours_delta_pct,
        labor_hours_delta_hours: config.labor_hours_delta_hours,
        prep_hours_delta: config.prep_hours_delta,
        value_add_features: config.value_add_features,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("company_tier_defaults")
        .upsert(payload, { onConflict: "company_id,tier,application_scope" });
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/app/settings/paint-library");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save tier defaults",
    };
  }
}
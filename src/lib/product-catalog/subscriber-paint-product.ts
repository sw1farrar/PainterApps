import "server-only";

import {
  computeEnrichmentStatus,
  toEnrichmentStatusInput,
} from "@/lib/product-catalog/enrichment-status";
import {
  catalogProductNamesMatch,
  normalizeCatalogProductName,
} from "@/lib/product-catalog/normalize-catalog-product-name";
import {
  findPaintManufacturerByName,
} from "@/lib/product-catalog/resolve-manufacturer-logo-url";
import type {
  PaintProductApplication,
  PaintProductCategory,
} from "@/lib/product-catalog/types";
import type { SaveCustomPaintProductInput } from "@/lib/paint-library/custom-product-form";
import { catalogCategoryToCompanyRole } from "@/lib/paint-library/platform-catalog-import";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import type { CompanyPaintProductRole } from "@/types/database";

export function companyRoleToPlatformCategory(
  role: CompanyPaintProductRole,
): PaintProductCategory {
  if (role === "primer") return "primer";
  if (role === "undercoater") return "undercoater";
  if (role === "sealer") return "sealer";
  return "paint";
}

function normalizeApplicationType(
  value: string | undefined,
): PaintProductApplication {
  if (value === "exterior" || value === "both" || value === "interior") {
    return value;
  }
  return "interior";
}

async function resolveManufacturerId(
  manufacturerName: string | undefined,
): Promise<string> {
  const query = manufacturerName?.trim() ?? "";
  const admin = createAdminClient();

  if (query) {
    const match = await findPaintManufacturerByName(query);
    if (match) return match.id;
  }

  const name = query || "Unknown manufacturer";
  let slug = slugify(name) || "unknown-manufacturer";

  const { data: existingSlug } = await admin
    .from("paint_manufacturers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug?.id) {
    slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
  }

  const { data, error } = await admin
    .from("paint_manufacturers")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Could not create manufacturer.");
  }

  return String(data.id);
}

function buildPlatformAttributePayload(
  input: SaveCustomPaintProductInput,
  manufacturerId: string,
  companyId: string,
  options?: {
    existingPaintProductId?: string | null;
    isSubscriberUpdate?: boolean;
  },
): Record<string, unknown> {
  const applicationType = normalizeApplicationType(input.applicationType);
  const category = companyRoleToPlatformCategory(input.role);
  const sheenOptions = input.sheenOptions ?? [];

  const enrichmentStatus = computeEnrichmentStatus(
    toEnrichmentStatusInput({
      can_image_url: input.canImageUrl ?? null,
      resin_type: input.resinType ?? null,
      resin_system: input.resinSystem ?? "unknown",
      base_type: input.baseType ?? "unknown",
      product_description: input.productDescription ?? null,
      sheen_options: sheenOptions,
      paint_system_feature_options: input.paintSystemFeatureOptions ?? [],
      product_uses: input.productUses ?? [],
      substrates: input.substrates ?? [],
      volume_solids_pct: input.volumeSolidsPct ?? null,
      voc_level: input.vocLevel ?? "unknown",
    }),
  );

  const payload: Record<string, unknown> = {
    manufacturer_id: manufacturerId,
    name: normalizeCatalogProductName(input.name),
    application_type: applicationType,
    category,
    resin_type: input.resinType ?? null,
    resin_system: input.resinSystem ?? "unknown",
    base_type: input.baseType ?? "unknown",
    product_description: input.productDescription ?? null,
    source_url: input.sourceUrl ?? null,
    sheen_options: sheenOptions,
    paint_system_features: input.paintSystemFeatures ?? [],
    paint_system_feature_options: input.paintSystemFeatureOptions ?? [],
    product_uses: input.productUses ?? [],
    substrates: input.substrates ?? [],
    recommended_uses: input.recommendedUses ?? [],
    voc_level: input.vocLevel ?? "unknown",
    is_self_priming: input.isSelfPriming ?? false,
    is_stain_blocking: input.isStainBlocking ?? false,
    is_mold_mildew_resistant: input.isMoldMildewResistant ?? false,
    is_scrubbable: input.isScrubbable ?? false,
    is_one_coat: input.isOneCoat ?? false,
    volume_solids_pct: input.volumeSolidsPct ?? null,
    volume_solids_label: input.volumeSolidsLabel ?? null,
    can_image_url: input.canImageUrl ?? null,
    can_image_storage_path: input.canImageStoragePath ?? null,
    enrichment_status: enrichmentStatus,
    updated_at: new Date().toISOString(),
  };

  if (!options?.existingPaintProductId) {
    payload.catalog_origin = "subscriber";
    payload.catalog_review_status = "pending_review";
    payload.submitted_by_company_id = companyId;
    payload.submitted_at = new Date().toISOString();
  } else if (options.isSubscriberUpdate) {
    payload.catalog_review_status = "pending_review";
    payload.submitted_at = new Date().toISOString();
  }

  return payload;
}

type PlatformProductCandidate = {
  id: string;
  name: string;
  catalog_origin: string | null;
  catalog_review_status: string | null;
  created_at: string;
};

function scorePlatformProductCandidate(
  row: PlatformProductCandidate,
): number {
  let score = 0;
  if (row.catalog_review_status === "pending_review") score += 100;
  if (row.catalog_origin === "subscriber") score += 50;
  return score;
}

function pickBestPlatformProductCandidate(
  candidates: PlatformProductCandidate[],
): PlatformProductCandidate | null {
  if (!candidates.length) return null;

  return [...candidates].sort((left, right) => {
    const scoreDiff =
      scorePlatformProductCandidate(right) -
      scorePlatformProductCandidate(left);
    if (scoreDiff !== 0) return scoreDiff;

    return (
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
  })[0];
}

async function findExistingPlatformProductId(input: {
  manufacturerId: string;
  name: string;
  applicationType: PaintProductApplication;
  category: PaintProductCategory;
}): Promise<string | null> {
  const normalizedName = normalizeCatalogProductName(input.name);
  if (!normalizedName) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("paint_products")
    .select("id, name, catalog_origin, catalog_review_status, created_at")
    .eq("manufacturer_id", input.manufacturerId)
    .eq("application_type", input.applicationType)
    .eq("category", input.category);

  if (error) throw new Error(error.message);

  const matches = ((data ?? []) as PlatformProductCandidate[]).filter((row) =>
    catalogProductNamesMatch(row.name, normalizedName),
  );

  const best = pickBestPlatformProductCandidate(matches);
  return best?.id ? String(best.id) : null;
}

export async function canCompanyEditPlatformProductAttributes(input: {
  paintProductId: string;
  companyId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("paint_products")
    .select("catalog_review_status, submitted_by_company_id")
    .eq("id", input.paintProductId)
    .maybeSingle();

  if (!data) return false;

  return (
    data.catalog_review_status === "pending_review" &&
    String(data.submitted_by_company_id ?? "") === input.companyId
  );
}

export async function upsertSubscriberPaintProduct(input: {
  saveInput: SaveCustomPaintProductInput;
  companyId: string;
  linkedPaintProductId?: string | null;
}): Promise<{ paintProductId: string }> {
  const admin = createAdminClient();
  const manufacturerId = await resolveManufacturerId(input.saveInput.manufacturerName);
  const applicationType = normalizeApplicationType(input.saveInput.applicationType);
  const category = companyRoleToPlatformCategory(input.saveInput.role);

  const paintProductId =
    input.linkedPaintProductId ??
    (await findExistingPlatformProductId({
      manufacturerId,
      name: input.saveInput.name,
      applicationType,
      category,
    }));

  if (paintProductId && input.saveInput.id) {
    const canEdit = await canCompanyEditPlatformProductAttributes({
      paintProductId,
      companyId: input.companyId,
    });

    if (canEdit) {
      const payload = buildPlatformAttributePayload(
        input.saveInput,
        manufacturerId,
        input.companyId,
        {
          existingPaintProductId: paintProductId,
          isSubscriberUpdate: true,
        },
      );

      const { error } = await admin
        .from("paint_products")
        .update(payload as never)
        .eq("id", paintProductId);

      if (error) throw new Error(error.message);
      return { paintProductId };
    }

    return { paintProductId };
  }

  if (paintProductId) {
    return { paintProductId };
  }

  const payload = buildPlatformAttributePayload(
    input.saveInput,
    manufacturerId,
    input.companyId,
  );

  const { data, error } = await admin
    .from("paint_products")
    .insert(payload as never)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existingId = await findExistingPlatformProductId({
        manufacturerId,
        name: input.saveInput.name,
        applicationType,
        category,
      });
      if (existingId) return { paintProductId: existingId };
    }
    throw new Error(error.message ?? "Could not add product to site catalog.");
  }

  if (!data?.id) {
    throw new Error("Could not add product to site catalog.");
  }

  return { paintProductId: String(data.id) };
}

export function platformCategoryToCompanyRole(
  category: string,
): CompanyPaintProductRole {
  return catalogCategoryToCompanyRole(category);
}
import type { SaveCustomPaintProductInput } from "@/lib/paint-library/custom-product-form";
import type { CompanyPaintProductRole } from "@/types/database";

/** Company-owned fields stored on the bookmark row — never duplicated platform metadata. */
export function buildCompanyProductBookmarkPayload(
  input: {
    paintProductId: string;
    unitCost: number;
    unitPrice?: number;
    coverageSqftPerGallon: number;
    role: CompanyPaintProductRole;
    sheen?: string | null;
    gallonsPerLaborHour?: number | null;
    /** Display fallbacks when the platform join is unavailable. */
    name?: string;
    manufacturerName?: string;
    applicationType?: string;
  },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    source: "catalog",
    paint_product_id: input.paintProductId,
    role: input.role,
    unit_cost: input.unitCost,
    unit_price: input.unitPrice ?? input.unitCost,
    coverage_sqft_per_gallon: input.coverageSqftPerGallon,
    sheen: input.sheen?.trim() || null,
    gallons_per_labor_hour: input.gallonsPerLaborHour ?? null,
    updated_at: new Date().toISOString(),
  };

  const name = input.name?.trim();
  if (name) payload.name = name;

  const manufacturerName = input.manufacturerName?.trim();
  if (manufacturerName) payload.manufacturer_name = manufacturerName;

  if (input.applicationType) {
    payload.application_type = input.applicationType;
  }

  return payload;
}

export function buildBookmarkPayloadFromCustomSaveInput(
  paintProductId: string,
  input: SaveCustomPaintProductInput,
  companyCoverage: number,
): Record<string, unknown> {
  return buildCompanyProductBookmarkPayload({
    paintProductId,
    unitCost: input.unitCost,
    unitPrice: input.unitPrice,
    coverageSqftPerGallon:
      input.coverageSqftPerGallon ?? companyCoverage,
    role: input.role,
    sheen: input.sheen,
    gallonsPerLaborHour: input.gallonsPerLaborHour,
    name: input.name,
    manufacturerName: input.manufacturerName,
    applicationType: input.applicationType,
  });
}
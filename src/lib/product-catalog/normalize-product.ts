import { parseStringArray } from "@/lib/product-catalog/enrichment-status";
import type {
  PaintProductRow,
  PaintProductUse,
  PaintResinSystem,
  PaintSheen,
  PaintSubstrate,
  PaintVocLevel,
} from "@/lib/product-catalog/types";

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseEnumArray<T extends string>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is T => typeof entry === "string");
}

export function normalizeProductRow(row: Record<string, unknown>): PaintProductRow {
  return {
    id: row.id as string,
    manufacturer_id: row.manufacturer_id as string,
    name: row.name as string,
    application_type: row.application_type as PaintProductRow["application_type"],
    category: row.category as PaintProductRow["category"],
    resin_type:
      typeof row.resin_type === "string" ? row.resin_type : null,
    resin_system:
      (row.resin_system as PaintResinSystem | undefined) ?? "unknown",
    base_type: (row.base_type as PaintProductRow["base_type"]) ?? "unknown",
    sheens: parseEnumArray<PaintSheen>(row.sheens),
    product_uses: parseEnumArray<PaintProductUse>(row.product_uses),
    substrates: parseEnumArray<PaintSubstrate>(row.substrates),
    voc_level: (row.voc_level as PaintVocLevel | undefined) ?? "unknown",
    is_self_priming: row.is_self_priming === true,
    is_stain_blocking: row.is_stain_blocking === true,
    is_mold_mildew_resistant: row.is_mold_mildew_resistant === true,
    is_scrubbable: row.is_scrubbable === true,
    is_one_coat: row.is_one_coat === true,
    recommended_uses: parseStringArray(row.recommended_uses),
    volume_solids_pct: parseNumeric(row.volume_solids_pct),
    volume_solids_label:
      typeof row.volume_solids_label === "string"
        ? row.volume_solids_label
        : null,
    attribute_source_url:
      typeof row.attribute_source_url === "string"
        ? row.attribute_source_url
        : null,
    source_url: typeof row.source_url === "string" ? row.source_url : null,
    can_image_url:
      typeof row.can_image_url === "string" ? row.can_image_url : null,
    can_image_storage_path:
      typeof row.can_image_storage_path === "string"
        ? row.can_image_storage_path
        : null,
    product_description:
      typeof row.product_description === "string"
        ? row.product_description
        : null,
    sheen_options: parseStringArray(row.sheen_options),
    paint_system_features: parseStringArray(row.paint_system_features),
    paint_system_feature_options: parseStringArray(
      row.paint_system_feature_options,
    ),
    enrichment_status:
      (row.enrichment_status as PaintProductRow["enrichment_status"]) ??
      "pending",
    enriched_at:
      typeof row.enriched_at === "string" ? row.enriched_at : null,
    enrichment_source_url:
      typeof row.enrichment_source_url === "string"
        ? row.enrichment_source_url
        : null,
    is_discontinued:
      typeof row.is_discontinued === "boolean" ? row.is_discontinued : false,
    discovered_at: row.discovered_at as string,
    created_by:
      typeof row.created_by === "string" ? row.created_by : null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
import { canImagePublicUrl } from "@/lib/systems/document-url";

export type ProductFieldKind = "number" | "integer" | "text" | "text[]";

export type ProductFieldDef = {
  key: string;
  kind: ProductFieldKind;
  label: string;
};

export const PRODUCT_FIELD_GROUPS: Array<{
  id: string;
  label: string;
  fields: ProductFieldDef[];
}> = [
  {
    id: "copy",
    label: "Story",
    fields: [
      { key: "description", kind: "text", label: "What it does" },
      { key: "features", kind: "text[]", label: "Features" },
      { key: "benefits", kind: "text[]", label: "Benefits" },
      { key: "quality_score", kind: "number", label: "Quality score" },
      { key: "quality_summary", kind: "text", label: "Quality summary" },
    ],
  },
  {
    id: "application",
    label: "Application",
    fields: [
      { key: "min_temp_f", kind: "integer", label: "Min temp °F" },
      { key: "max_temp_f", kind: "integer", label: "Max temp °F" },
      { key: "max_humidity_pct", kind: "integer", label: "Max humidity %" },
      { key: "application_rh_max", kind: "integer", label: "Application RH max %" },
      { key: "min_dew_spread_f", kind: "integer", label: "Min dew spread °F" },
      { key: "rain_ready_minutes", kind: "integer", label: "Rain-ready minutes" },
      { key: "rain_ready_conditions", kind: "text", label: "Rain-ready conditions" },
      { key: "recoat_hours", kind: "number", label: "Recoat hours" },
      { key: "storage_temp_f_min", kind: "integer", label: "Storage min °F" },
      { key: "storage_temp_f_max", kind: "integer", label: "Storage max °F" },
    ],
  },
  {
    id: "film",
    label: "Film & coverage",
    fields: [
      { key: "volume_solids_pct", kind: "number", label: "Volume solids %" },
      { key: "weight_solids_pct", kind: "number", label: "Weight solids %" },
      { key: "coverage_sqft_gal_min", kind: "integer", label: "Coverage sqft/gal min" },
      { key: "coverage_sqft_gal_max", kind: "integer", label: "Coverage sqft/gal max" },
      { key: "wet_film_mils_min", kind: "number", label: "Wet film mils min" },
      { key: "wet_film_mils_max", kind: "number", label: "Wet film mils max" },
      { key: "dry_film_mils_min", kind: "number", label: "Dry film mils min" },
      { key: "dry_film_mils_max", kind: "number", label: "Dry film mils max" },
      { key: "dry_to_touch_hours", kind: "number", label: "Dry to touch hours" },
      { key: "full_cure_days", kind: "number", label: "Full cure days" },
      { key: "washable_after_days", kind: "integer", label: "Washable after days" },
    ],
  },
  {
    id: "physical",
    label: "Physical",
    fields: [
      { key: "vehicle_type", kind: "text", label: "Vehicle type" },
      { key: "resin_type", kind: "text", label: "Resin type" },
      { key: "weight_per_gallon_lbs", kind: "number", label: "Weight per gallon lbs" },
      { key: "viscosity", kind: "text", label: "Viscosity" },
      { key: "flash_point", kind: "text", label: "Flash point" },
      { key: "ph_max_substrate", kind: "number", label: "Max substrate pH" },
      { key: "clean_up", kind: "text", label: "Clean up" },
      { key: "thinner", kind: "text", label: "Thinner" },
      { key: "tint_system", kind: "text", label: "Tint system" },
      { key: "gloss_60_deg_min", kind: "number", label: "Gloss 60° min" },
      { key: "gloss_60_deg_max", kind: "number", label: "Gloss 60° max" },
    ],
  },
  {
    id: "spray",
    label: "Spray / mix",
    fields: [
      { key: "spray_airless_psi_min", kind: "integer", label: "Airless PSI min" },
      { key: "spray_airless_psi_max", kind: "integer", label: "Airless PSI max" },
      { key: "spray_tip_min", kind: "text", label: "Tip min" },
      { key: "spray_tip_max", kind: "text", label: "Tip max" },
      { key: "pot_life_hours", kind: "number", label: "Pot life hours" },
      { key: "mix_ratio", kind: "text", label: "Mix ratio" },
      { key: "shelf_life_months", kind: "integer", label: "Shelf life months" },
    ],
  },
  {
    id: "docs",
    label: "Docs & certs",
    fields: [
      { key: "official_tds_pdf_url", kind: "text", label: "Official TDS PDF URL" },
      { key: "can_image_url", kind: "text", label: "Can image URL" },
      { key: "certifications", kind: "text[]", label: "Certifications" },
      { key: "astm_refs", kind: "text[]", label: "ASTM refs" },
    ],
  },
];

export const TYPED_TDS_KEYS = PRODUCT_FIELD_GROUPS.flatMap((g) =>
  g.fields.map((f) => f.key),
);

const CORE_KEYS = [
  "id",
  "manufacturer_id",
  "name",
  "sku",
  "kind",
  "substrates",
  "interior",
  "exterior",
  "voc_g_l",
  "sheens",
  "tds_url",
  "tds_revision",
  "tds_date",
  "notes",
  "can_image_url",
  "can_image_path",
  "attrs",
  "updated_at",
] as const;

export const PRODUCT_PATCH_KEYS = new Set<string>([
  ...CORE_KEYS,
  ...TYPED_TDS_KEYS,
]);

function asNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asText(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function asTextArr(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

export function optionalNumber(row: Record<string, unknown>, key: string) {
  const n = asNum(row[key]);
  return n == null ? undefined : n;
}

export function optionalText(row: Record<string, unknown>, key: string) {
  const s = asText(row[key]);
  return s ?? undefined;
}

export function optionalTextArr(row: Record<string, unknown>, key: string) {
  if (row[key] == null) return undefined;
  return asTextArr(row[key]) ?? [];
}

/** Patch object from MCP/form args. Omits missing keys so we never invent defaults. */
export function productPatchFromArgs(args: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  const fieldByKey = new Map(
    PRODUCT_FIELD_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f])),
  );

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined) continue;
    if (key === "id" || key === "updated_at") continue;
    if (key === "attrs") {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        patch.attrs = value;
      }
      continue;
    }
    if (key === "substrates" || key === "sheens") {
      const arr = asTextArr(value);
      if (arr) patch[key] = arr;
      continue;
    }
    if (key === "interior" || key === "exterior") {
      if (typeof value === "boolean") patch[key] = value;
      else if (value === "true" || value === "on") patch[key] = true;
      else if (value === "false" || value === "") patch[key] = false;
      continue;
    }
    if (
      key === "name" ||
      key === "sku" ||
      key === "kind" ||
      key === "manufacturer_id" ||
      key === "tds_url" ||
      key === "tds_revision" ||
      key === "tds_date" ||
      key === "notes"
    ) {
      if (value === null) patch[key] = null;
      else patch[key] = String(value);
      continue;
    }
    if (key === "voc_g_l") {
      patch[key] = asNum(value);
      continue;
    }
    const field = fieldByKey.get(key);
    if (!field) continue;
    if (value === null || value === "") {
      patch[key] = field.kind === "text[]" ? [] : null;
      continue;
    }
    if (field.kind === "text") patch[key] = asText(value);
    else if (field.kind === "text[]") patch[key] = asTextArr(value) ?? [];
    else if (field.kind === "integer") {
      const n = asNum(value);
      patch[key] = n == null ? null : Math.round(n);
    } else {
      patch[key] = asNum(value);
    }
  }
  if (Object.keys(patch).length) patch.updated_at = new Date().toISOString();
  return patch;
}

export function productRowToMcp(row: Record<string, unknown>) {
  const attrs =
    row.attrs && typeof row.attrs === "object" && !Array.isArray(row.attrs)
      ? row.attrs
      : {};
  const out: Record<string, unknown> = {
    id: row.id,
    manufacturer_id: row.manufacturer_id,
    name: row.name,
    sku: row.sku ?? "",
    kind: row.kind,
    substrates: row.substrates ?? [],
    interior: Boolean(row.interior),
    exterior: Boolean(row.exterior),
    voc_g_l: row.voc_g_l ?? null,
    sheens: row.sheens ?? [],
    min_temp_f: row.min_temp_f ?? null,
    max_temp_f: row.max_temp_f ?? null,
    max_humidity_pct: row.max_humidity_pct ?? null,
    min_dew_spread_f: row.min_dew_spread_f ?? null,
    rain_ready_minutes: row.rain_ready_minutes ?? null,
    recoat_hours: row.recoat_hours ?? null,
    tds_url: row.tds_url ?? "",
    tds_revision: row.tds_revision ?? "",
    tds_date: row.tds_date ?? null,
    notes: row.notes ?? "",
    can_image_url: canImagePublicUrl(
      row.can_image_path ? String(row.can_image_path) : null,
      String(row.can_image_url ?? ""),
    ),
    can_image_path: row.can_image_path ?? null,
    attrs,
    updated_at: row.updated_at ?? null,
  };
  for (const key of TYPED_TDS_KEYS) {
    if (key in out) continue;
    const v = row[key];
    out[key] = v ?? (key === "certifications" || key === "astm_refs" ? [] : null);
  }
  return out;
}

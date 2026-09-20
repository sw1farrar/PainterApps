import type { Manufacturer, TdsProduct, TdsSystem } from "@/lib/systems/types";
import { documentPublicUrl } from "@/lib/systems/document-url";
import { TYPED_TDS_KEYS } from "@/lib/systems/product-fields";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CORPUS_CATALOG, type Catalog } from "@/lib/systems/corpus-catalog";

export type { Catalog };
export { CORPUS_CATALOG };

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function productFromRow(row: Record<string, unknown>): TdsProduct {
  const attrs =
    row.attrs && typeof row.attrs === "object" && !Array.isArray(row.attrs)
      ? (row.attrs as Record<string, unknown>)
      : {};
  return {
    id: String(row.id),
    manufacturerId: String(row.manufacturer_id),
    name: String(row.name ?? ""),
    sku: String(row.sku ?? ""),
    kind: (row.kind as TdsProduct["kind"]) || "other",
    substrates: asStringArray(row.substrates) as TdsProduct["substrates"],
    interior: Boolean(row.interior),
    exterior: Boolean(row.exterior),
    vocGL: Number(row.voc_g_l ?? 0),
    sheens: asStringArray(row.sheens) as TdsProduct["sheens"],
    minTempF: Number(row.min_temp_f ?? 50),
    maxTempF: Number(row.max_temp_f ?? 90),
    maxHumidityPct: Number(row.max_humidity_pct ?? 85),
    minDewSpreadF:
      row.min_dew_spread_f != null ? Number(row.min_dew_spread_f) : undefined,
    rainReadyMinutes:
      row.rain_ready_minutes != null
        ? Number(row.rain_ready_minutes)
        : undefined,
    recoatHours:
      row.recoat_hours != null ? Number(row.recoat_hours) : undefined,
    tdsUrl: String(row.tds_url ?? ""),
    tdsRevision: String(row.tds_revision ?? ""),
    tdsDate: String(row.tds_date ?? ""),
    notes: String(row.notes ?? ""),
    description: row.description ? String(row.description) : undefined,
    features: asStringArray(row.features),
    benefits: asStringArray(row.benefits),
    attrs,
    specs: Object.fromEntries(
      TYPED_TDS_KEYS.filter((key) => row[key] != null && row[key] !== "").map(
        (key) => [key, row[key]],
      ),
    ),
  };
}

export function manufacturerFromRow(row: Record<string, unknown>): Manufacturer {
  return {
    id: String(row.id),
    slug: String(row.slug ?? row.id),
    name: String(row.name ?? ""),
    website: String(row.website ?? ""),
  };
}

export function systemFromRow(row: Record<string, unknown>): TdsSystem {
  return {
    id: String(row.id),
    manufacturerId: String(row.manufacturer_id),
    name: String(row.name ?? ""),
    interior: Boolean(row.interior),
    exterior: Boolean(row.exterior),
    substrates: asStringArray(row.substrates) as TdsSystem["substrates"],
    applicationTypes: asStringArray(
      row.application_types,
    ) as TdsSystem["applicationTypes"],
    failureModes: asStringArray(row.failure_modes) as TdsSystem["failureModes"],
    prepNotes: String(row.prep_notes ?? ""),
    primerProductId: String(row.primer_product_id ?? ""),
    topcoatProductId: String(row.topcoat_product_id ?? ""),
    midcoatProductId: row.midcoat_product_id
      ? String(row.midcoat_product_id)
      : undefined,
    why: String(row.why ?? ""),
    rankHint: Number(row.rank_hint ?? 0),
    attrs:
      row.attrs && typeof row.attrs === "object" && !Array.isArray(row.attrs)
        ? (row.attrs as Record<string, unknown>)
        : {},
  };
}

export function productToRow(p: Partial<TdsProduct> & { id: string; manufacturerId: string; name: string }) {
  return {
    id: p.id,
    manufacturer_id: p.manufacturerId,
    name: p.name,
    sku: p.sku ?? "",
    kind: p.kind ?? "other",
    substrates: p.substrates ?? [],
    interior: Boolean(p.interior),
    exterior: Boolean(p.exterior),
    voc_g_l: p.vocGL ?? null,
    sheens: p.sheens ?? [],
    min_temp_f: p.minTempF ?? 50,
    max_temp_f: p.maxTempF ?? 90,
    max_humidity_pct: p.maxHumidityPct ?? 85,
    min_dew_spread_f: p.minDewSpreadF ?? null,
    rain_ready_minutes: p.rainReadyMinutes ?? null,
    recoat_hours: p.recoatHours ?? null,
    tds_url: p.tdsUrl ?? "",
    tds_revision: p.tdsRevision ?? "",
    tds_date: p.tdsDate || null,
    notes: p.notes ?? "",
    description: p.description ?? null,
    features: p.features ?? [],
    benefits: p.benefits ?? [],
    attrs: p.attrs ?? {},
    updated_at: new Date().toISOString(),
    ...(p.specs ?? {}),
  };
}

export async function loadCatalog(): Promise<Catalog> {
  const db = supabaseAdmin();
  if (!db) return CORPUS_CATALOG;
  const [mfrs, products, systems] = await Promise.all([
    db.from("tds_manufacturers").select("*").order("name"),
    db.from("tds_products").select("*").order("name"),
    db.from("tds_systems").select("*").order("rank_hint", { ascending: false }),
  ]);
  if (products.error || !products.data?.length) return CORPUS_CATALOG;
  const docs = await db
    .from("tds_documents")
    .select("id,product_id,kind,title,url,revision,storage_path");
  const byProduct = new Map<string, TdsProduct["documents"]>();
  for (const row of docs.data ?? []) {
    const pid = String(row.product_id ?? "");
    const list = byProduct.get(pid) ?? [];
    list.push({
      id: String(row.id),
      kind: String(row.kind ?? "pds"),
      title: String(row.title ?? "PDS"),
      publicUrl: documentPublicUrl(
        row.storage_path ? String(row.storage_path) : null,
        String(row.url ?? ""),
      ),
      revision: String(row.revision ?? ""),
      stored: Boolean(row.storage_path),
    });
    byProduct.set(pid, list);
  }
  return {
    manufacturers: (mfrs.data ?? []).map((r) =>
      manufacturerFromRow(r as Record<string, unknown>),
    ),
    products: products.data.map((r) => {
      const p = productFromRow(r as Record<string, unknown>);
      p.documents = byProduct.get(p.id) ?? [];
      return p;
    }),
    systems: (systems.data ?? []).map((r) =>
      systemFromRow(r as Record<string, unknown>),
    ),
  };
}

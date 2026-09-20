import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { MANUFACTURERS, PRODUCTS, SYSTEMS } from "../src/data/tds/corpus";

function seedDocId(productId: string, kind: string) {
  const b = createHash("sha1")
    .update(`tds-doc:${productId}:${kind}`)
    .digest()
    .subarray(0, 16);
  b[6] = (b[6]! & 0x0f) | 0x50;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = Buffer.from(b).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Skipping DB seed — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    console.log(
      `Corpus ready in-memory: ${MANUFACTURERS.length} manufacturers, ${PRODUCTS.length} products, ${SYSTEMS.length} systems.`,
    );
    return;
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: mfrErr } = await db.from("tds_manufacturers").upsert(
    MANUFACTURERS.map((m) => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      website: m.website,
    })),
  );
  if (mfrErr) throw mfrErr;

  const { error: prodErr } = await db.from("tds_products").upsert(
    PRODUCTS.map((p) => ({
      id: p.id,
      manufacturer_id: p.manufacturerId,
      name: p.name,
      sku: p.sku,
      kind: p.kind,
      substrates: p.substrates,
      interior: p.interior,
      exterior: p.exterior,
      voc_g_l: p.vocGL,
      sheens: p.sheens,
      min_temp_f: p.minTempF,
      max_temp_f: p.maxTempF,
      max_humidity_pct: p.maxHumidityPct,
      min_dew_spread_f: p.minDewSpreadF ?? null,
      rain_ready_minutes: p.rainReadyMinutes ?? null,
      recoat_hours: p.recoatHours ?? null,
      attrs: {},
      tds_url: p.tdsUrl,
      tds_revision: p.tdsRevision,
      tds_date: p.tdsDate || null,
      notes: p.notes,
    })),
  );
  if (prodErr) throw prodErr;

  const { error: sysErr } = await db.from("tds_systems").upsert(
    SYSTEMS.map((s) => ({
      id: s.id,
      manufacturer_id: s.manufacturerId,
      name: s.name,
      interior: s.interior,
      exterior: s.exterior,
      substrates: s.substrates,
      application_types: s.applicationTypes ?? [],
      failure_modes: s.failureModes,
      prep_notes: s.prepNotes,
      primer_product_id: s.primerProductId,
      topcoat_product_id: s.topcoatProductId,
      midcoat_product_id: s.midcoatProductId ?? null,
      why: s.why,
      rank_hint: s.rankHint,
    })),
  );
  if (sysErr) throw sysErr;

  const sheets = PRODUCTS.filter((p) => p.tdsUrl).map((p) => ({
    id: seedDocId(p.id, "pds"),
    product_id: p.id,
    kind: "pds",
    title: `${p.name} product data sheet`,
    url: p.tdsUrl,
    revision: p.tdsRevision || "",
    published_at: p.tdsDate || null,
    mime_type: "application/pdf",
  }));
  const { error: docErr } = await db.from("tds_documents").upsert(sheets);
  if (docErr) throw docErr;

  console.log(
    `Seeded ${MANUFACTURERS.length} manufacturers, ${PRODUCTS.length} products, ${SYSTEMS.length} systems, ${sheets.length} data sheets.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

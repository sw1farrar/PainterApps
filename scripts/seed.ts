import { createClient } from "@supabase/supabase-js";
import { MANUFACTURERS, PRODUCTS, SYSTEMS } from "../src/data/tds/corpus";

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
      tds_url: p.tdsUrl,
      tds_revision: p.tdsRevision,
      tds_date: p.tdsDate,
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

  console.log(
    `Seeded ${MANUFACTURERS.length} manufacturers, ${PRODUCTS.length} products, ${SYSTEMS.length} systems.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

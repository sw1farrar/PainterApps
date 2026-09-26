import { isNewsEditor } from "@/lib/news/editors";
import { getZipPaintDay } from "@/lib/paintday/get-zip";
import { McpToolError } from "@/lib/mcp/data";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  loadCatalog,
  productFromRow,
  systemFromRow,
} from "@/lib/systems/catalog";
import { matchSystems } from "@/lib/systems/match";
import {
  applicationClass,
  compareByQuality,
  qualityMcp,
} from "@/lib/systems/quality";
import {
  PRODUCT_PATCH_KEYS,
  productPatchFromArgs,
  productRowToMcp,
} from "@/lib/systems/product-fields";
import {
  APPLICATION_TYPES,
  type ApplicationType,
  type ProductKind,
  type TdsProduct,
  type TdsSystem,
} from "@/lib/systems/types";

function admin() {
  const db = supabaseAdmin();
  if (!db) throw new McpToolError("PainterApps is not connected to live data.");
  return db;
}

function slugId(raw: string) {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return s || `p-${Date.now()}`;
}

async function isPlatformAdmin(userId: string) {
  const { data } = await admin()
    .from("profiles")
    .select("is_platform_admin, account_role")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(
    data?.is_platform_admin || data?.account_role === "platform_admin",
  );
}

async function requireEditor(userId: string) {
  if (await isNewsEditor(userId)) return;
  if (await isPlatformAdmin(userId)) return;
  throw new McpToolError(
    "Only PainterApps editors can change the product catalog.",
  );
}

function num(args: Record<string, unknown>, key: string) {
  const v = args[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return undefined;
}

function bool(args: Record<string, unknown>, key: string) {
  const v = args[key];
  if (typeof v === "boolean") return v;
  return undefined;
}

const QUALITY_READ_ONLY = new Set([
  "quality",
  "quality_score",
  "quality_claims",
  "quality_resin",
  "application_class",
]);

function extraAttrs(args: Record<string, unknown>) {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (key === "can_image_base64" || QUALITY_READ_ONLY.has(key)) continue;
    if (!PRODUCT_PATCH_KEYS.has(key) && value !== undefined) extra[key] = value;
  }
  return extra;
}

function productForMcp(row: Record<string, unknown>) {
  return {
    ...productRowToMcp(row),
    quality: qualityMcp(productFromRow(row)),
  };
}

function imageExt(bytes: Uint8Array) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return { ext: "png", mime: "image/png" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { ext: "jpg", mime: "image/jpeg" };
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return { ext: "webp", mime: "image/webp" };
  throw new McpToolError("Can image must be PNG, JPEG, or WebP.");
}

async function storeCanImage(productId: string, b64: string) {
  const raw = b64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
  const bytes = Uint8Array.from(Buffer.from(raw, "base64"));
  if (bytes.byteLength < 32 || bytes.byteLength > 5_000_000) {
    throw new McpToolError("Can image must be between 32 bytes and 5 MB.");
  }
  const { ext, mime } = imageExt(bytes);
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin()
    .storage.from("tds-cans")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new McpToolError(error.message);
  return path;
}

async function applyCanImage(
  productId: string,
  args: Record<string, unknown>,
  patch: Record<string, unknown>,
  previousPath?: string | null,
) {
  const b64 = typeof args.can_image_base64 === "string" ? args.can_image_base64 : "";
  if (b64) {
    const path = await storeCanImage(productId, b64);
    if (previousPath && previousPath !== path) {
      await admin().storage.from("tds-cans").remove([previousPath]);
    }
    patch.can_image_path = path;
    patch.can_image_url = null;
    return;
  }
  if (args.can_image_url !== undefined) {
    patch.can_image_url =
      args.can_image_url == null || args.can_image_url === ""
        ? null
        : String(args.can_image_url);
  }
}

function strArr(args: Record<string, unknown>, key: string) {
  const v = args[key];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v.trim()) {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

export async function listManufacturers() {
  const catalog = await loadCatalog();
  return catalog.manufacturers.map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    website: m.website,
  }));
}

export async function upsertManufacturer(
  userId: string,
  args: Record<string, unknown>,
) {
  await requireEditor(userId);
  const name = String(args.name ?? "").trim();
  if (!name) throw new McpToolError("name is required.");
  const id = String(args.id ?? slugId(name));
  const { error } = await admin()
    .from("tds_manufacturers")
    .upsert({
      id,
      slug: String(args.slug ?? id),
      name,
      website: String(args.website ?? ""),
      attrs:
        args.attrs && typeof args.attrs === "object" && !Array.isArray(args.attrs)
          ? args.attrs
          : {},
      updated_at: new Date().toISOString(),
    });
  if (error) throw new McpToolError(error.message);
  return { id, name };
}

export async function deleteManufacturer(userId: string, id: string) {
  await requireEditor(userId);
  if (!id) throw new McpToolError("id is required.");
  const { error } = await admin().from("tds_manufacturers").delete().eq("id", id);
  if (error) throw new McpToolError(error.message);
  return { deleted: id };
}

export function selectProducts(
  products: TdsProduct[],
  args: Record<string, unknown>,
) {
  let rows = products;
  const q = String(args.query ?? "").toLowerCase().trim();
  const kind = args.kind ? String(args.kind) : "";
  const mfr = args.manufacturer_id ? String(args.manufacturer_id) : "";
  const application = args.application_class
    ? String(args.application_class)
    : "";
  if (kind) rows = rows.filter((p) => p.kind === kind);
  if (mfr) rows = rows.filter((p) => p.manufacturerId === mfr);
  if (args.exterior === true) rows = rows.filter((p) => p.exterior);
  if (args.interior === true) rows = rows.filter((p) => p.interior);
  if (application) {
    rows = rows.filter((p) => applicationClass(p) === application);
  }
  if (q) {
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }
  return [...rows].sort(compareByQuality).slice(0, 80).map((p) => {
    const quality = qualityMcp(p);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      manufacturer_id: p.manufacturerId,
      kind: p.kind,
      interior: p.interior,
      exterior: p.exterior,
      can_image_url: p.canImageUrl ?? null,
      quality,
    };
  });
}

export async function listProducts(args: Record<string, unknown>) {
  const catalog = await loadCatalog();
  return selectProducts(catalog.products, args);
}

export async function getProduct(id: string) {
  if (!id) throw new McpToolError("id is required.");
  const db = admin();
  const byId = await db.from("tds_products").select("*").eq("id", id).maybeSingle();
  const row =
    byId.data ??
    (await db.from("tds_products").select("*").eq("sku", id).maybeSingle()).data;
  if (!row) throw new McpToolError("Product not found.");
  return productForMcp(row as Record<string, unknown>);
}

export async function upsertProduct(
  userId: string,
  args: Record<string, unknown>,
) {
  await requireEditor(userId);
  const idHint = String(args.id ?? "").trim();
  const existing = idHint
    ? await admin().from("tds_products").select("*").eq("id", idHint).maybeSingle()
    : { data: null };
  const prev = existing.data
    ? productFromRow(existing.data as Record<string, unknown>)
    : null;
  const name = String(args.name ?? prev?.name ?? "").trim();
  const manufacturerId = String(
    args.manufacturer_id ?? prev?.manufacturerId ?? "",
  ).trim();
  if (!name) throw new McpToolError("name is required.");
  if (!manufacturerId) throw new McpToolError("manufacturer_id is required.");
  const id = idHint || slugId(`${manufacturerId}-${name}`);
  const patch = productPatchFromArgs(args);
  const extra = extraAttrs(args);
  const attrs = {
    ...(prev?.attrs ?? {}),
    ...extra,
    ...(args.attrs && typeof args.attrs === "object" && !Array.isArray(args.attrs)
      ? (args.attrs as Record<string, unknown>)
      : {}),
  };
  patch.id = id;
  patch.manufacturer_id = manufacturerId;
  patch.name = name;
  patch.attrs = attrs;
  patch.updated_at = new Date().toISOString();
  if (!prev) {
    if (patch.kind == null) patch.kind = "topcoat";
    if (patch.interior == null) patch.interior = false;
    if (patch.exterior == null) patch.exterior = false;
  }
  await applyCanImage(
    id,
    args,
    patch,
    existing.data?.can_image_path
      ? String(existing.data.can_image_path)
      : null,
  );
  const { data, error } = await admin()
    .from("tds_products")
    .upsert(patch)
    .select("*")
    .single();
  if (error) throw new McpToolError(error.message);
  return productForMcp(data as Record<string, unknown>);
}

export async function patchProduct(
  userId: string,
  args: Record<string, unknown>,
) {
  await requireEditor(userId);
  const id = String(args.id ?? "").trim();
  if (!id) throw new McpToolError("id is required.");
  const existing = await admin()
    .from("tds_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing.data) throw new McpToolError("Product not found.");
  const patch = productPatchFromArgs(args);
  delete patch.id;
  const extra = extraAttrs(args);
  if (Object.keys(extra).length || args.attrs) {
    const prevAttrs =
      existing.data.attrs &&
      typeof existing.data.attrs === "object" &&
      !Array.isArray(existing.data.attrs)
        ? (existing.data.attrs as Record<string, unknown>)
        : {};
    patch.attrs = {
      ...prevAttrs,
      ...extra,
      ...(args.attrs && typeof args.attrs === "object" && !Array.isArray(args.attrs)
        ? (args.attrs as Record<string, unknown>)
        : {}),
    };
  }
  await applyCanImage(
    id,
    args,
    patch,
    existing.data.can_image_path
      ? String(existing.data.can_image_path)
      : null,
  );
  if (!Object.keys(patch).length) {
    return productForMcp(existing.data as Record<string, unknown>);
  }
  const { data, error } = await admin()
    .from("tds_products")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new McpToolError(error.message);
  return productForMcp(data as Record<string, unknown>);
}

export async function deleteProduct(userId: string, id: string) {
  await requireEditor(userId);
  if (!id) throw new McpToolError("id is required.");
  const used = await admin()
    .from("tds_systems")
    .select("id,name")
    .or(
      `primer_product_id.eq.${id},topcoat_product_id.eq.${id},midcoat_product_id.eq.${id}`,
    )
    .limit(5);
  if (used.data?.length) {
    throw new McpToolError(
      `Product is used by systems: ${used.data.map((s) => s.id).join(", ")}. Update those first.`,
    );
  }
  const { error } = await admin().from("tds_products").delete().eq("id", id);
  if (error) throw new McpToolError(error.message);
  return { deleted: id };
}

function systemToMcp(s: TdsSystem) {
  return {
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
    attrs: s.attrs ?? {},
  };
}

function parseApplicationTypes(args: Record<string, unknown>) {
  const raw = strArr(args, "application_types");
  if (raw == null) return undefined;
  const allowed = new Set<string>(APPLICATION_TYPES);
  const bad = raw.filter((id) => !allowed.has(id));
  if (bad.length) {
    throw new McpToolError(
      `Unknown application_types: ${bad.join(", ")}. Use: ${APPLICATION_TYPES.join(", ")}.`,
    );
  }
  return raw as ApplicationType[];
}

export function listApplicationTypes() {
  return APPLICATION_TYPES.map((id) => ({ id }));
}

export async function listSystems(args: Record<string, unknown>) {
  const catalog = await loadCatalog();
  let rows = catalog.systems;
  if (args.exterior === true) rows = rows.filter((s) => s.exterior);
  if (args.interior === true) rows = rows.filter((s) => s.interior);
  const app = args.application_type ? String(args.application_type) : "";
  if (app) {
    rows = rows.filter((s) =>
      (s.applicationTypes ?? []).includes(app as ApplicationType),
    );
  }
  const mfr = args.manufacturer_id ? String(args.manufacturer_id) : "";
  if (mfr) rows = rows.filter((s) => s.manufacturerId === mfr);
  return rows.map(systemToMcp);
}

export async function getSystem(id: string) {
  const catalog = await loadCatalog();
  const system = catalog.systems.find((s) => s.id === id);
  if (!system) throw new McpToolError("System not found.");
  return systemToMcp(system);
}

export async function upsertSystem(
  userId: string,
  args: Record<string, unknown>,
) {
  await requireEditor(userId);
  const name = String(args.name ?? "").trim();
  const manufacturerId = String(args.manufacturer_id ?? "").trim();
  const primer = String(args.primer_product_id ?? "").trim();
  const topcoat = String(args.topcoat_product_id ?? "").trim();
  if (!name || !manufacturerId || !primer || !topcoat) {
    throw new McpToolError(
      "name, manufacturer_id, primer_product_id, and topcoat_product_id are required.",
    );
  }
  const id = String(args.id ?? slugId(`${manufacturerId}-${name}`));
  const payload: Record<string, unknown> = {
    id,
    manufacturer_id: manufacturerId,
    name,
    interior: bool(args, "interior") ?? false,
    exterior: bool(args, "exterior") ?? true,
    substrates: strArr(args, "substrates") ?? [],
    failure_modes: strArr(args, "failure_modes") ?? ["none"],
    prep_notes: String(args.prep_notes ?? ""),
    primer_product_id: primer,
    topcoat_product_id: topcoat,
    midcoat_product_id: args.midcoat_product_id
      ? String(args.midcoat_product_id)
      : null,
    why: String(args.why ?? ""),
    rank_hint: num(args, "rank_hint") ?? 0,
    attrs:
      args.attrs && typeof args.attrs === "object" && !Array.isArray(args.attrs)
        ? args.attrs
        : {},
    updated_at: new Date().toISOString(),
  };
  const apps = parseApplicationTypes(args);
  if (apps) payload.application_types = apps;
  const { error } = await admin().from("tds_systems").upsert(payload);
  if (error) throw new McpToolError(error.message);
  const row = await admin().from("tds_systems").select("*").eq("id", id).single();
  return systemToMcp(
    systemFromRow((row.data ?? { id, name }) as Record<string, unknown>),
  );
}

export async function patchSystem(
  userId: string,
  args: Record<string, unknown>,
) {
  await requireEditor(userId);
  const id = String(args.id ?? "").trim();
  if (!id) throw new McpToolError("id is required.");
  const existing = await admin()
    .from("tds_systems")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing.data) throw new McpToolError("System not found.");

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (args.name != null) patch.name = String(args.name).trim();
  if (args.manufacturer_id != null) {
    patch.manufacturer_id = String(args.manufacturer_id).trim();
  }
  if (args.interior != null) patch.interior = bool(args, "interior");
  if (args.exterior != null) patch.exterior = bool(args, "exterior");
  const substrates = strArr(args, "substrates");
  if (substrates) patch.substrates = substrates;
  const apps = parseApplicationTypes(args);
  if (apps) patch.application_types = apps;
  const failures = strArr(args, "failure_modes");
  if (failures) patch.failure_modes = failures;
  if (args.prep_notes != null) patch.prep_notes = String(args.prep_notes);
  if (args.primer_product_id != null) {
    patch.primer_product_id = String(args.primer_product_id);
  }
  if (args.topcoat_product_id != null) {
    patch.topcoat_product_id = String(args.topcoat_product_id);
  }
  if (args.midcoat_product_id !== undefined) {
    patch.midcoat_product_id = args.midcoat_product_id
      ? String(args.midcoat_product_id)
      : null;
  }
  if (args.why != null) patch.why = String(args.why);
  if (args.rank_hint != null) patch.rank_hint = num(args, "rank_hint");
  if (args.attrs && typeof args.attrs === "object" && !Array.isArray(args.attrs)) {
    const prev =
      existing.data.attrs &&
      typeof existing.data.attrs === "object" &&
      !Array.isArray(existing.data.attrs)
        ? (existing.data.attrs as Record<string, unknown>)
        : {};
    patch.attrs = { ...prev, ...args.attrs };
  }

  const { data, error } = await admin()
    .from("tds_systems")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new McpToolError(error.message);
  return systemToMcp(systemFromRow(data as Record<string, unknown>));
}

export async function deleteSystem(userId: string, id: string) {
  await requireEditor(userId);
  if (!id) throw new McpToolError("id is required.");
  const { error } = await admin().from("tds_systems").delete().eq("id", id);
  if (error) throw new McpToolError(error.message);
  return { deleted: id };
}

export async function suggestSystems(args: Record<string, unknown>) {
  const catalog = await loadCatalog();
  const zip = String(args.zip ?? "").trim();
  let tempF = num(args, "temp_f");
  let humidity = num(args, "humidity");
  let rainWithinHours = num(args, "rain_within_hours");
  if (zip && (tempF == null || humidity == null)) {
    const day = await getZipPaintDay(zip);
    if (day) {
      tempF = tempF ?? day.forecast.current.tempF;
      humidity = humidity ?? day.forecast.current.humidity;
      const rainH = day.forecast.crewPlan?.rainHour;
      const nowH = new Date().getHours();
      if (rainWithinHours == null && rainH != null) {
        rainWithinHours = Math.max(0, rainH - nowH);
      }
    }
  }
  const query = {
    interior: args.interior === true,
    exterior: args.exterior !== false,
    substrate: (String(args.substrate ?? "wood") || "wood") as
      | "wood"
      | "drywall"
      | "masonry"
      | "stucco"
      | "metal"
      | "previously-painted"
      | "concrete-floor",
    failureMode: args.failure_mode
      ? (String(args.failure_mode) as
          | "none"
          | "peeling"
          | "chalking"
          | "tannin"
          | "efflorescence"
          | "rust")
      : undefined,
    manufacturerId: args.manufacturer_id
      ? String(args.manufacturer_id)
      : undefined,
    vocSensitive: args.voc_sensitive === true,
    tempF,
    humidity,
    rainWithinHours,
  };
  return matchSystems(query, catalog)
    .slice(0, 8)
    .map((m) => ({
      systemId: m.system.id,
      system: m.system.name,
      manufacturer: m.manufacturer.name,
      primer: m.primer.name,
      topcoat: m.topcoat.name,
      score: m.score,
      reasons: m.reasons,
      window: {
        minTempF: m.topcoat.minTempF,
        maxTempF: m.topcoat.maxTempF,
        maxHumidityPct: m.topcoat.maxHumidityPct,
        rainReadyMinutes: m.topcoat.rainReadyMinutes ?? null,
        recoatHours: m.topcoat.recoatHours ?? null,
      },
    }));
}

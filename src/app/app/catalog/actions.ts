"use server";

import { revalidatePath } from "next/cache";
import { requireCatalogEditor } from "@/lib/systems/catalog-access";
import { productPatchFromArgs } from "@/lib/systems/product-fields";
import { supabaseAdmin } from "@/lib/supabase/server";

function slugId(raw: string) {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return s || `p-${Date.now()}`;
}

function formArgs(form: FormData) {
  const args: Record<string, unknown> = {};
  const skip = new Set(["substrates", "sheens", "interior", "exterior", "mode"]);
  for (const [key, value] of form.entries()) {
    if (typeof value !== "string") continue;
    if (skip.has(key)) continue;
    args[key] = value;
  }
  args.interior = form.has("interior");
  args.exterior = form.has("exterior");
  args.substrates = form.getAll("substrates").map(String);
  args.sheens = form.getAll("sheens").map(String);
  const attrsRaw = String(form.get("attrs_json") ?? "").trim();
  if (attrsRaw) {
    try {
      args.attrs = JSON.parse(attrsRaw);
    } catch {
      args.attrs_json_error = true;
    }
  }
  return args;
}

function revalidateCatalog(id?: string) {
  revalidatePath("/app/catalog");
  revalidatePath("/systems");
  revalidatePath("/api/tds");
  if (id) revalidatePath(`/app/catalog/${id}`);
}

export async function saveCatalogProduct(formData: FormData) {
  const access = await requireCatalogEditor();
  const db = supabaseAdmin();
  if (!access || !db) return { error: "forbidden" };
  const args = formArgs(formData);
  if (args.attrs_json_error) return { error: "attrs JSON is not valid." };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "id" };
  const patch = productPatchFromArgs(args);
  delete patch.id;
  const { error } = await db.from("tds_products").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidateCatalog(id);
  return { ok: true, id };
}

export async function createCatalogProduct(formData: FormData) {
  const access = await requireCatalogEditor();
  const db = supabaseAdmin();
  if (!access || !db) return { error: "forbidden" };
  const args = formArgs(formData);
  if (args.attrs_json_error) return { error: "attrs JSON is not valid." };
  const name = String(args.name ?? "").trim();
  const manufacturerId = String(args.manufacturer_id ?? "").trim();
  if (!name) return { error: "Name is required." };
  if (!manufacturerId) return { error: "Manufacturer is required." };
  const id =
    String(formData.get("id") ?? "").trim() ||
    slugId(`${manufacturerId}-${name}`);
  const patch = productPatchFromArgs(args);
  patch.id = id;
  patch.name = name;
  patch.manufacturer_id = manufacturerId;
  if (patch.kind == null) patch.kind = "topcoat";
  const { error } = await db.from("tds_products").insert(patch);
  if (error) return { error: error.message };
  revalidateCatalog(id);
  return { ok: true, id };
}

export async function deleteCatalogProduct(formData: FormData) {
  const access = await requireCatalogEditor();
  const db = supabaseAdmin();
  if (!access || !db) return { error: "forbidden" };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "id" };
  const used = await db
    .from("tds_systems")
    .select("id")
    .or(
      `primer_product_id.eq.${id},topcoat_product_id.eq.${id},midcoat_product_id.eq.${id}`,
    )
    .limit(5);
  if (used.data?.length) {
    return {
      error: `Used by systems: ${used.data.map((s) => s.id).join(", ")}. Update those first.`,
    };
  }
  const { error } = await db.from("tds_products").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateCatalog();
  return { ok: true };
}

export async function patchCatalogFlags(formData: FormData) {
  const access = await requireCatalogEditor();
  const db = supabaseAdmin();
  if (!access || !db) return { error: "forbidden" };
  const id = String(formData.get("id") ?? "").trim();
  const field = String(formData.get("field") ?? "");
  if (!id || (field !== "interior" && field !== "exterior")) {
    return { error: "invalid" };
  }
  const value = String(formData.get("value") ?? "") === "true";
  const { error } = await db
    .from("tds_products")
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateCatalog(id);
  return { ok: true };
}

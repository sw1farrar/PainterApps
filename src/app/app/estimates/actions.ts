"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth/access";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { DEFAULT_HOURLY_RATE, DEFAULT_RATES } from "@/lib/estimates/defaults";
import {
  areaTakeoff,
  gallonsFor,
  hoursForSurface,
  type RateUnit,
} from "@/lib/estimates/time-based";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const access = await requireAccess("/app/estimates");
  const supabase = await createClient();
  if (!supabase) redirect("/login?next=/app/estimates");
  await ensureProfile(access.userId);
  return { userId: access.userId, supabase, companyId: access.companyId };
}

export async function ensureCompany() {
  const { userId, supabase } = await requireUser();
  await supabase.from("company_settings").upsert(
    { user_id: userId, hourly_rate: DEFAULT_HOURLY_RATE },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  const { count } = await supabase
    .from("production_rates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (!count) {
    await supabase.from("production_rates").insert(
      DEFAULT_RATES.map((r) => ({
        user_id: userId,
        category: r.category,
        name: r.name,
        unit: r.unit,
        coats: r.coats,
        material_spread_sqft_gal: r.materialSpreadSqftGal ?? null,
        material_cost_per_gal: r.materialCostPerGal ?? null,
        sort: r.sort,
      })),
    );
  }
}

export async function saveCompanySettings(formData: FormData) {
  const { userId, supabase, companyId } = await requireUser();
  await ensureCompany();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const hourlyRate = Number(formData.get("hourly_rate") ?? DEFAULT_HOURLY_RATE);
  const showHours = formData.get("show_hours") === "on";
  await supabase.from("company_settings").upsert({
    user_id: userId,
    company_name: companyName,
    phone,
    hourly_rate: hourlyRate,
    show_hours_on_proposal: showHours,
  });
  if (companyId) {
    await supabase
      .from("companies")
      .update({
        name: companyName,
        phone,
        hourly_rate: hourlyRate,
        show_hours_on_proposal: showHours,
      })
      .eq("id", companyId);
  }
  revalidatePath("/app/settings");
  revalidatePath("/app/estimates");
}

export async function saveCustomer(formData: FormData) {
  const { userId, supabase, companyId } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const payload = {
    user_id: userId,
    company_id: companyId ?? null,
    name: String(formData.get("name") ?? "Customer").trim() || "Customer",
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    zip: String(formData.get("zip") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
  if (id) {
    await supabase.from("customers").update(payload).eq("id", id);
  } else {
    await supabase.from("customers").insert(payload);
  }
  revalidatePath("/app/customers");
}

export async function deleteCustomer(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("customers").delete().eq("id", id);
  revalidatePath("/app/customers");
}

export async function createEstimate(formData: FormData) {
  const { userId, supabase, companyId } = await requireUser();
  await ensureCompany();
  let hourlyRate = DEFAULT_HOURLY_RATE;
  if (companyId) {
    const { data: shared } = await supabase
      .from("companies")
      .select("hourly_rate")
      .eq("id", companyId)
      .maybeSingle();
    if (shared?.hourly_rate != null) hourlyRate = Number(shared.hourly_rate);
  } else {
    const { data: settings } = await supabase
      .from("company_settings")
      .select("hourly_rate")
      .eq("user_id", userId)
      .maybeSingle();
    hourlyRate = Number(settings?.hourly_rate ?? DEFAULT_HOURLY_RATE);
  }
  let lastQuery = supabase
    .from("estimates")
    .select("number")
    .order("number", { ascending: false })
    .limit(1);
  lastQuery = companyId
    ? lastQuery.eq("company_id", companyId)
    : lastQuery.eq("user_id", userId);
  const { data: last } = await lastQuery.maybeSingle();
  const { data, error } = await supabase
    .from("estimates")
    .insert({
      user_id: userId,
      company_id: companyId ?? null,
      customer_id: String(formData.get("customer_id") ?? "") || null,
      job_id: String(formData.get("job_id") ?? "") || null,
      zip: String(formData.get("zip") ?? "").trim(),
      number: (last?.number ?? 0) + 1,
      hourly_rate_snapshot: hourlyRate,
      notes: String(formData.get("notes") ?? "").trim(),
    })
    .select("id")
    .single();
  if (error || !data) redirect("/app/estimates");
  revalidatePath("/app/estimates");
  redirect(`/app/estimates/${data.id}`);
}

async function retotal(
  estimateId: string,
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
) {
  const { data: estimate } = await supabase
    .from("estimates")
    .select("id,hourly_rate_snapshot")
    .eq("id", estimateId)
    .maybeSingle();
  if (!estimate) return;
  const { data: areas } = await supabase
    .from("estimate_areas")
    .select("id")
    .eq("estimate_id", estimateId);
  let hours = 0;
  let material = 0;
  let total = 0;
  const hourly = Number(estimate.hourly_rate_snapshot);
  for (const area of areas ?? []) {
    const { data: surfaces } = await supabase
      .from("estimate_surfaces")
      .select("hours_paint,hours_prep,gallons,amount")
      .eq("area_id", area.id);
    for (const s of surfaces ?? []) {
      const h = Number(s.hours_paint) + Number(s.hours_prep);
      hours += h;
      total += Number(s.amount);
      material += Math.max(0, Number(s.amount) - h * hourly);
    }
  }
  await supabase
    .from("estimates")
    .update({
      totals: { hours, labor: hours * hourly, material, total },
    })
    .eq("id", estimateId);
}

export async function addArea(formData: FormData) {
  const { supabase } = await requireUser();
  const estimateId = String(formData.get("estimate_id") ?? "");
  await supabase.from("estimate_areas").insert({
    estimate_id: estimateId,
    name: String(formData.get("name") ?? "Area").trim() || "Area",
    kind: String(formData.get("kind") ?? "room") === "surface" ? "surface" : "room",
    length: Number(formData.get("length") ?? 0),
    width: Number(formData.get("width") ?? 0),
    height: Number(formData.get("height") ?? 8),
    opening_sqft: Number(formData.get("opening_sqft") ?? 0),
  });
  await retotal(estimateId, supabase);
  revalidatePath(`/app/estimates/${estimateId}`);
}

export async function addSurface(formData: FormData) {
  const { userId, supabase } = await requireUser();
  const estimateId = String(formData.get("estimate_id") ?? "");
  const areaId = String(formData.get("area_id") ?? "");
  const rateId = String(formData.get("rate_id") ?? "");
  const coats = (Number(formData.get("coats") ?? 2) || 2) as 1 | 2 | 3;
  const qtyOverride = Number(formData.get("qty") ?? 0);
  const prep = Number(formData.get("prep") ?? 0);
  const { data: area } = await supabase
    .from("estimate_areas")
    .select("kind,length,width,height,opening_sqft")
    .eq("id", areaId)
    .maybeSingle();
  const { data: rate } = await supabase
    .from("production_rates")
    .select("*")
    .eq("id", rateId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!area || !rate) return;
  const coatsMap = rate.coats as { 1: number; 2: number; 3: number };
  const unit = rate.unit as RateUnit;
  const rateValue = Number(coatsMap[coats] ?? coatsMap[2] ?? 0);
  const takeoff = areaTakeoff({
    name: "",
    kind: area.kind as "room" | "surface",
    length: Number(area.length),
    width: Number(area.width),
    height: Number(area.height),
    openingSqft: Number(area.opening_sqft),
  });
  let qty = qtyOverride;
  if (!qty) {
    if (unit === "hr_per_item") qty = 1;
    else if (unit === "lnft_per_hr") qty = takeoff.baseLnft;
    else if (String(rate.name).toLowerCase().includes("ceiling")) qty = takeoff.ceilingSqft;
    else qty = takeoff.wallSqft;
  }
  const hours = hoursForSurface(qty, rateValue, unit);
  const spread = Number(rate.material_spread_sqft_gal ?? 0);
  const gallons =
    unit === "sqft_per_hr" && spread ? gallonsFor(qty, spread, coats) : 0;
  const material = gallons * Number(rate.material_cost_per_gal ?? 0);
  const { data: settings } = await supabase
    .from("company_settings")
    .select("hourly_rate")
    .eq("user_id", userId)
    .maybeSingle();
  const hourly = Number(settings?.hourly_rate ?? DEFAULT_HOURLY_RATE);
  await supabase.from("estimate_surfaces").insert({
    area_id: areaId,
    rate_id: rateId,
    label: rate.name,
    unit,
    qty,
    coats,
    rate: rateValue,
    hours_paint: hours,
    hours_prep: prep,
    gallons,
    amount: (hours + prep) * hourly + material,
  });
  await retotal(estimateId, supabase);
  revalidatePath(`/app/estimates/${estimateId}`);
}

export async function deleteArea(formData: FormData) {
  const { supabase } = await requireUser();
  const estimateId = String(formData.get("estimate_id") ?? "");
  const areaId = String(formData.get("area_id") ?? "");
  await supabase.from("estimate_areas").delete().eq("id", areaId);
  await retotal(estimateId, supabase);
  revalidatePath(`/app/estimates/${estimateId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess, requireFeature } from "@/lib/auth/access";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { DEFAULT_HOURLY_RATE, DEFAULT_RATES } from "@/lib/estimates/defaults";
import { rateIdsForTemplate } from "@/lib/estimates/templates";
import {
  areaTakeoff,
  gallonsFor,
  hoursForSurface,
  type RateUnit,
} from "@/lib/estimates/time-based";
import { isBrevoConfigured, sendEmail } from "@/lib/email/brevo";
import { normalizeWebsite } from "@/lib/estimates/letter";
import { createClient } from "@/lib/supabase/server";

async function requireUser(nextPath = "/app") {
  const access = await requireAccess(nextPath);
  const supabase = await createClient();
  if (!supabase) redirect(`/login?next=${nextPath}`);
  await ensureProfile(access.userId);
  return { userId: access.userId, supabase, companyId: access.companyId };
}

async function requireEstimate() {
  const access = await requireFeature("estimate_pro", "/app/estimates");
  const supabase = await createClient();
  if (!supabase) redirect("/login?next=/app/estimates");
  await ensureProfile(access.userId);
  return { userId: access.userId, supabase, companyId: access.companyId };
}

export async function ensureCompany() {
  const { userId, supabase, companyId } = await requireUser("/app/settings");
  await supabase.from("company_settings").upsert(
    { user_id: userId, hourly_rate: DEFAULT_HOURLY_RATE },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  let countQuery = supabase
    .from("production_rates")
    .select("id", { count: "exact", head: true });
  countQuery = companyId
    ? countQuery.eq("company_id", companyId)
    : countQuery.eq("user_id", userId);
  const { count } = await countQuery;
  if (!count) {
    await supabase.from("production_rates").insert(
      DEFAULT_RATES.map((r) => ({
        user_id: userId,
        company_id: companyId ?? null,
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

export async function saveCompanyProfile(formData: FormData) {
  const { userId, supabase, companyId } = await requireUser("/app/settings");
  await ensureCompany();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const website = normalizeWebsite(String(formData.get("website") ?? ""));
  const address = String(formData.get("address") ?? "").trim();
  await supabase.from("company_settings").upsert(
    { user_id: userId, company_name: companyName, phone },
    { onConflict: "user_id" },
  );
  if (companyId) {
    await supabase
      .from("companies")
      .update({ name: companyName, phone, email, website, address })
      .eq("id", companyId);
  }
  revalidatePath("/app/settings");
}

export async function saveCompanySettings(formData: FormData) {
  const { userId, supabase, companyId } = await requireEstimate();
  await ensureCompany();
  const hourlyRate = Number(formData.get("hourly_rate") ?? DEFAULT_HOURLY_RATE);
  const showHours = formData.get("show_hours") === "on";
  const legalName = String(formData.get("legal_name") ?? "").trim();
  const license = String(formData.get("license_number") ?? "").trim();
  const insurance = String(formData.get("insurance_line") ?? "").trim();
  const accent = String(formData.get("accent_color") ?? "#0f766e").trim() || "#0f766e";
  const validDays = Math.min(
    365,
    Math.max(1, Number(formData.get("proposal_valid_days") ?? 30) || 30),
  );
  const payment = String(formData.get("payment_terms") ?? "").trim();
  const exclusions = String(formData.get("exclusions") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  await supabase
    .from("company_settings")
    .update({
      hourly_rate: hourlyRate,
      show_hours_on_proposal: showHours,
    })
    .eq("user_id", userId);
  if (companyId) {
    await supabase
      .from("companies")
      .update({
        hourly_rate: hourlyRate,
        show_hours_on_proposal: showHours,
        legal_name: legalName,
        license_number: license,
        insurance_line: insurance,
        accent_color: accent,
        proposal_valid_days: validDays,
        payment_terms: payment,
        exclusions,
        ...(formData.has("logo_url") ? { logo_url: logoUrl } : {}),
      })
      .eq("id", companyId);
  }
  revalidatePath("/app/settings");
  revalidatePath("/app/estimates");
}

export async function saveCustomer(formData: FormData) {
  const { userId, supabase, companyId } = await requireEstimate();
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
    revalidatePath(`/app/customers/${id}`);
  } else {
    await supabase.from("customers").insert(payload);
  }
  revalidatePath("/app/customers");
}

export async function deleteCustomer(id: string) {
  const { supabase } = await requireEstimate();
  await supabase.from("customers").delete().eq("id", id);
  revalidatePath("/app/customers");
}

export async function startEstimate(opts?: {
  jobId?: string | null;
  zip?: string | null;
  customerId?: string | null;
}) {
  const form = new FormData();
  if (opts?.jobId) form.set("job_id", opts.jobId);
  if (opts?.zip) form.set("zip", opts.zip);
  if (opts?.customerId) form.set("customer_id", opts.customerId);
  return createEstimate(form, { redirectToLetter: false });
}

export async function createEstimate(
  formData: FormData,
  opts?: { redirectToLetter?: boolean },
) {
  const { userId, supabase, companyId } = await requireEstimate();
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
  const customerId = String(formData.get("customer_id") ?? "") || null;
  let zip = String(formData.get("zip") ?? "").trim();
  if (!zip && customerId) {
    const { data: cust } = await supabase
      .from("customers")
      .select("zip")
      .eq("id", customerId)
      .maybeSingle();
    zip = cust?.zip ?? "";
  }
  const { data, error } = await supabase
    .from("estimates")
    .insert({
      user_id: userId,
      company_id: companyId ?? null,
      customer_id: customerId,
      job_id: String(formData.get("job_id") ?? "") || null,
      zip,
      number: (last?.number ?? 0) + 1,
      hourly_rate_snapshot: hourlyRate,
      notes: String(formData.get("notes") ?? "").trim(),
    })
    .select("id")
    .single();
  if (error || !data) redirect("/app/estimates");
  revalidatePath("/app/estimates");
  revalidatePath("/app");
  if (opts?.redirectToLetter === false) return data.id;
  redirect(`/app/estimates/${data.id}`);
}

export async function deleteEstimate(formData: FormData) {
  const { supabase } = await requireEstimate();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("estimates").delete().eq("id", id);
  revalidatePath("/app/estimates");
  revalidatePath("/app");
  redirect("/app/estimates");
}

export async function saveQuoteStyle(formData: FormData) {
  const access = await requireFeature("estimate_pro", "/app/settings");
  const supabase = await createClient();
  if (!supabase || !access.companyId) return;
  const style = String(formData.get("quote_style") ?? "time_based");
  if (style !== "simple" && style !== "time_based") return;
  await supabase
    .from("companies")
    .update({ quote_style: style })
    .eq("id", access.companyId);
  revalidatePath("/app/settings");
}

export async function saveCompanyLogo(formData: FormData) {
  const access = await requireFeature("estimate_pro", "/app/settings");
  if (!access.isOwner || !access.companyId) return;
  const supabase = await createClient();
  if (!supabase) return;
  const url = String(formData.get("logo_url") ?? "").trim();
  await supabase
    .from("companies")
    .update({ logo_url: url })
    .eq("id", access.companyId);
  revalidatePath("/app/settings");
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
  const { userId, supabase, companyId } = await requireEstimate();
  const estimateId = String(formData.get("estimate_id") ?? "");
  const { data: area } = await supabase
    .from("estimate_areas")
    .insert({
      estimate_id: estimateId,
      name: String(formData.get("name") ?? "Area").trim() || "Area",
      kind: String(formData.get("kind") ?? "room") === "surface" ? "surface" : "room",
      length: Number(formData.get("length") ?? 0),
      width: Number(formData.get("width") ?? 0),
      height: Number(formData.get("height") ?? 8),
      opening_sqft: Number(formData.get("opening_sqft") ?? 0),
    })
    .select("id")
    .single();
  let rateIds = String(formData.get("rate_ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const template = String(formData.get("template") ?? "");
  if (!rateIds.length && template) {
    let ratesQuery = supabase
      .from("production_rates")
      .select("id,name")
      .order("sort");
    ratesQuery = companyId
      ? ratesQuery.eq("company_id", companyId)
      : ratesQuery.eq("user_id", userId);
    const { data: shopRates } = await ratesQuery;
    rateIds = rateIdsForTemplate(template, shopRates ?? []);
  }
  if (area?.id) {
    for (const rateId of rateIds) {
      await insertSurface({
        supabase,
        userId,
        companyId,
        estimateId,
        areaId: area.id,
        rateId,
        coats: 2,
        qtyOverride: 0,
        prep: 0,
      });
    }
  }
  await retotal(estimateId, supabase);
  revalidatePath(`/app/estimates/${estimateId}`);
}

type Db = NonNullable<Awaited<ReturnType<typeof createClient>>>;

async function insertSurface(opts: {
  supabase: Db;
  userId: string;
  companyId: string | null;
  estimateId: string;
  areaId: string;
  rateId: string;
  coats: 1 | 2 | 3;
  qtyOverride: number;
  prep: number;
}) {
  const { supabase, estimateId, areaId, rateId, coats, qtyOverride, prep } = opts;
  const { data: area } = await supabase
    .from("estimate_areas")
    .select("kind,length,width,height,opening_sqft")
    .eq("id", areaId)
    .maybeSingle();
  const { data: rate } = await supabase
    .from("production_rates")
    .select("*")
    .eq("id", rateId)
    .maybeSingle();
  if (!area || !rate) return;
  const priced = priceFromRate(area, rate, coats, qtyOverride, prep);
  const hourly = await estimateHourly(supabase, estimateId);
  const { material, ...row } = priced;
  await supabase.from("estimate_surfaces").insert({
    area_id: areaId,
    rate_id: rateId,
    ...row,
    amount: (row.hours_paint + row.hours_prep) * hourly + material,
  });
}

function priceFromRate(
  area: {
    kind: string;
    length: number;
    width: number;
    height: number;
    opening_sqft: number;
  },
  rate: {
    name: string;
    unit: string;
    coats: unknown;
    material_spread_sqft_gal: number | null;
    material_cost_per_gal: number | null;
  },
  coats: 1 | 2 | 3,
  qtyOverride: number,
  prep: number,
) {
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
  return {
    label: rate.name,
    unit,
    qty,
    coats,
    rate: rateValue,
    hours_paint: hours,
    hours_prep: prep,
    gallons,
    material,
  };
}

async function estimateHourly(supabase: Db, estimateId: string) {
  const { data } = await supabase
    .from("estimates")
    .select("hourly_rate_snapshot")
    .eq("id", estimateId)
    .maybeSingle();
  return Number(data?.hourly_rate_snapshot ?? DEFAULT_HOURLY_RATE);
}

export async function addSurface(formData: FormData) {
  const { userId, supabase, companyId } = await requireEstimate();
  const estimateId = String(formData.get("estimate_id") ?? "");
  await insertSurface({
    supabase,
    userId,
    companyId,
    estimateId,
    areaId: String(formData.get("area_id") ?? ""),
    rateId: String(formData.get("rate_id") ?? ""),
    coats: (Number(formData.get("coats") ?? 2) || 2) as 1 | 2 | 3,
    qtyOverride: Number(formData.get("qty") ?? 0),
    prep: Number(formData.get("prep") ?? 0),
  });
  await retotal(estimateId, supabase);
  revalidatePath(`/app/estimates/${estimateId}`);
}

export async function deleteArea(formData: FormData) {
  const { supabase } = await requireEstimate();
  const estimateId = String(formData.get("estimate_id") ?? "");
  const areaId = String(formData.get("area_id") ?? "");
  await supabase.from("estimate_areas").delete().eq("id", areaId);
  await retotal(estimateId, supabase);
  revalidatePath(`/app/estimates/${estimateId}`);
}

export async function updateArea(formData: FormData) {
  const { supabase } = await requireEstimate();
  const estimateId = String(formData.get("estimate_id") ?? "");
  const areaId = String(formData.get("area_id") ?? "");
  await supabase
    .from("estimate_areas")
    .update({
      name: String(formData.get("name") ?? "Area").trim() || "Area",
      kind: String(formData.get("kind") ?? "room") === "surface" ? "surface" : "room",
      length: Number(formData.get("length") ?? 0),
      width: Number(formData.get("width") ?? 0),
      height: Number(formData.get("height") ?? 8),
      opening_sqft: Number(formData.get("opening_sqft") ?? 0),
    })
    .eq("id", areaId);
  await repriceArea(supabase, estimateId, areaId);
  revalidatePath(`/app/estimates/${estimateId}`);
}

export async function updateSurface(formData: FormData) {
  const { supabase } = await requireEstimate();
  const estimateId = String(formData.get("estimate_id") ?? "");
  const surfaceId = String(formData.get("surface_id") ?? "");
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
    .maybeSingle();
  if (!area || !rate) return;
  const priced = priceFromRate(area, rate, coats, qtyOverride, prep);
  const hourly = await estimateHourly(supabase, estimateId);
  const { material, ...row } = priced;
  await supabase
    .from("estimate_surfaces")
    .update({
      rate_id: rateId,
      ...row,
      amount: (row.hours_paint + row.hours_prep) * hourly + material,
    })
    .eq("id", surfaceId);
  await retotal(estimateId, supabase);
  revalidatePath(`/app/estimates/${estimateId}`);
}

export async function deleteSurface(formData: FormData) {
  const { supabase } = await requireEstimate();
  const estimateId = String(formData.get("estimate_id") ?? "");
  const surfaceId = String(formData.get("surface_id") ?? "");
  await supabase.from("estimate_surfaces").delete().eq("id", surfaceId);
  await retotal(estimateId, supabase);
  revalidatePath(`/app/estimates/${estimateId}`);
}

async function repriceArea(supabase: Db, estimateId: string, areaId: string) {
  const { data: area } = await supabase
    .from("estimate_areas")
    .select("kind,length,width,height,opening_sqft")
    .eq("id", areaId)
    .maybeSingle();
  const { data: surfaces } = await supabase
    .from("estimate_surfaces")
    .select("id,rate_id,coats,hours_prep,qty")
    .eq("area_id", areaId);
  if (!area) return;
  const hourly = await estimateHourly(supabase, estimateId);
  for (const s of surfaces ?? []) {
    if (!s.rate_id) continue;
    const { data: rate } = await supabase
      .from("production_rates")
      .select("*")
      .eq("id", s.rate_id)
      .maybeSingle();
    if (!rate) continue;
    const coats = (Number(s.coats) === 1 || Number(s.coats) === 3
      ? Number(s.coats)
      : 2) as 1 | 2 | 3;
    const priced = priceFromRate(
      area,
      rate,
      coats,
      Number(s.qty ?? 0),
      Number(s.hours_prep ?? 0),
    );
    const { material, ...row } = priced;
    await supabase
      .from("estimate_surfaces")
      .update({
        ...row,
        amount: (row.hours_paint + row.hours_prep) * hourly + material,
      })
      .eq("id", s.id);
  }
  await retotal(estimateId, supabase);
}

export async function updateEstimateMeta(formData: FormData) {
  const { supabase } = await requireEstimate();
  const estimateId = String(formData.get("estimate_id") ?? "");
  const zip = String(formData.get("zip") ?? "").trim();
  const hourly = Number(formData.get("hourly_rate") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();
  const patch: Record<string, unknown> = {};
  if (zip) patch.zip = zip;
  if (hourly > 0) patch.hourly_rate_snapshot = hourly;
  if (formData.has("notes")) patch.notes = notes;
  if (Object.keys(patch).length) {
    await supabase.from("estimates").update(patch).eq("id", estimateId);
  }
  if (hourly > 0) {
    const { data: areas } = await supabase
      .from("estimate_areas")
      .select("id")
      .eq("estimate_id", estimateId);
    for (const a of areas ?? []) {
      await repriceArea(supabase, estimateId, a.id);
    }
  }
  revalidatePath(`/app/estimates/${estimateId}`);
  revalidatePath("/app/estimates");
  revalidatePath("/app");
}

export async function setEstimateStatus(formData: FormData) {
  const { supabase } = await requireEstimate();
  const estimateId = String(formData.get("estimate_id") ?? "");
  const status = String(formData.get("status") ?? "draft");
  if (!["draft", "sent", "accepted", "declined"].includes(status)) return;
  await supabase.from("estimates").update({ status }).eq("id", estimateId);
  revalidatePath(`/app/estimates/${estimateId}`);
  revalidatePath("/app/estimates");
  revalidatePath("/app");
}

export async function saveEstimateCustomer(formData: FormData) {
  const { userId, supabase, companyId } = await requireEstimate();
  const estimateId = String(formData.get("estimate_id") ?? "");
  let customerId = String(formData.get("customer_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!customerId && name) {
    const { data } = await supabase
      .from("customers")
      .insert({
        user_id: userId,
        company_id: companyId ?? null,
        name,
        phone: String(formData.get("phone") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        address: String(formData.get("address") ?? "").trim(),
        zip: String(formData.get("zip") ?? "").trim(),
      })
      .select("id,zip")
      .single();
    customerId = data?.id ?? "";
    if (data?.zip) {
      await supabase
        .from("estimates")
        .update({ customer_id: customerId, zip: data.zip })
        .eq("id", estimateId);
    }
  }
  if (customerId) {
    const { data: cust } = await supabase
      .from("customers")
      .select("zip")
      .eq("id", customerId)
      .maybeSingle();
    await supabase
      .from("estimates")
      .update({
        customer_id: customerId,
        ...(cust?.zip ? { zip: cust.zip } : {}),
      })
      .eq("id", estimateId);
  } else {
    await supabase
      .from("estimates")
      .update({ customer_id: null })
      .eq("id", estimateId);
  }
  revalidatePath(`/app/estimates/${estimateId}`);
  revalidatePath("/app/customers");
  revalidatePath("/app");
}

export async function saveProductionRates(formData: FormData) {
  const { supabase } = await requireEstimate();
  const ids = formData.getAll("rate_id").map(String);
  for (const id of ids) {
    await supabase
      .from("production_rates")
      .update({
        coats: {
          1: Number(formData.get(`coat1_${id}`) ?? 0),
          2: Number(formData.get(`coat2_${id}`) ?? 0),
          3: Number(formData.get(`coat3_${id}`) ?? 0),
        },
        material_spread_sqft_gal: Number(formData.get(`spread_${id}`) ?? 0) || null,
        material_cost_per_gal: Number(formData.get(`cost_${id}`) ?? 0) || null,
      })
      .eq("id", id);
  }
  revalidatePath("/app/settings");
}

export async function sendEstimateEmail(input: {
  estimateId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, companyId } = await requireEstimate();
  const to = input.to.trim().toLowerCase();
  if (!to.includes("@")) return { ok: false, error: "Enter a valid email." };
  if (!isBrevoConfigured()) {
    return { ok: false, error: "Email isn’t set up for this shop yet." };
  }
  const { data: estimate } = await supabase
    .from("estimates")
    .select("id,number,view_token,customer_id,totals")
    .eq("id", input.estimateId)
    .maybeSingle();
  if (!estimate) return { ok: false, error: "Estimate not found." };
  if (estimate.customer_id) {
    await supabase
      .from("customers")
      .update({ email: to })
      .eq("id", estimate.customer_id);
  }
  const { data: shop } = companyId
    ? await supabase
        .from("companies")
        .select("name,phone,email")
        .eq("id", companyId)
        .maybeSingle()
    : { data: null };
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://painterapps.com";
  const viewUrl = `${origin}/e/${estimate.view_token}`;
  const htmlBody = input.body
    .split("\n")
    .map((line) =>
      line.trim() === viewUrl
        ? `<p><a href="${viewUrl}" style="color:#0f766e">View estimate</a></p>`
        : `<p style="margin:0 0 12px">${escapeHtml(line) || "&nbsp;"}</p>`,
    )
    .join("");
  const result = await sendEmail({
    to,
    subject: input.subject.trim() || `Estimate #${estimate.number}`,
    html: `<div style="font-family:Georgia,serif;color:#171717;line-height:1.5;max-width:560px">${htmlBody}<p><a href="${viewUrl}" style="display:inline-block;margin-top:8px;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:4px">View estimate</a></p></div>`,
    text: input.body,
    tags: ["estimate", `estimate-${estimate.number}`],
    replyTo: shop?.email ? { email: shop.email, name: shop.name || undefined } : undefined,
  });
  if (!result.success) {
    return { ok: false, error: result.error };
  }
  await supabase
    .from("estimates")
    .update({ status: "sent" })
    .eq("id", estimate.id);
  revalidatePath(`/app/estimates/${estimate.id}`);
  revalidatePath("/app/estimates");
  revalidatePath("/app");
  return { ok: true };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

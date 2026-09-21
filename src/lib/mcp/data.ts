import { isNewsEditor } from "@/lib/news/editors";
import { slugify } from "@/lib/news/slug";
import { getZipPaintDay } from "@/lib/paintday/get-zip";
import { supabaseAdmin } from "@/lib/supabase/server";

export class McpToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpToolError";
  }
}

function admin() {
  const db = supabaseAdmin();
  if (!db) throw new McpToolError("PainterApps is not connected to live data.");
  return db;
}

export async function getWhoami(userId: string) {
  const db = admin();
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data.user) throw new McpToolError("Account not found.");
  const { data: profile } = await db
    .from("profiles")
    .select("locale, units, is_editor, access_enabled, account_role, company_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile?.access_enabled !== true) {
    throw new McpToolError("This account is disabled.");
  }
  const { data: company } = await db
    .from("company_settings")
    .select("company_name, phone, hourly_rate")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    userId,
    email: data.user.email ?? null,
    locale: profile?.locale ?? "en",
    units: profile?.units ?? "imperial",
    isEditor: Boolean(profile?.is_editor),
    accessEnabled: profile?.access_enabled === true,
    role: profile?.account_role ?? "owner",
    companyId: profile?.company_id ?? null,
    companyName: company?.company_name || null,
    companyPhone: company?.phone || null,
    hourlyRate: company?.hourly_rate != null ? Number(company.hourly_rate) : null,
  };
}

async function companyScope(userId: string, needEstimatePro = false) {
  const { data: profile } = await admin()
    .from("profiles")
    .select("company_id, access_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile?.access_enabled !== true) {
    throw new McpToolError("This account is disabled.");
  }
  if (needEstimatePro && profile?.company_id) {
    const { data: company } = await admin()
      .from("companies")
      .select("features")
      .eq("id", profile.company_id)
      .maybeSingle();
    const features = company?.features as Record<string, unknown> | null;
    if (features?.estimate_pro !== true) {
      throw new McpToolError("Estimate Pro is not enabled for this company.");
    }
  }
  return { companyId: profile?.company_id ?? null };
}

export async function getPaintDay(zip: string) {
  const day = await getZipPaintDay(zip);
  if (!day) throw new McpToolError("Could not score that ZIP.");
  const f = day.forecast;
  return {
    place: day.place,
    source: f.source,
    fetchedAt: f.fetchedAt,
    currentScore: f.currentScore.total,
    band: f.currentScore.band,
    tempF: f.current.tempF,
    humidity: f.current.humidity,
    precipChance: f.current.precipProbability,
    windMph: f.current.windMph,
    gustMph: f.current.gustMph ?? null,
    startHour: f.crewPlan?.startHour ?? null,
    wrapHour: f.crewPlan?.wrapHour ?? null,
    days: f.days.slice(0, 7).map((d) => ({
      date: d.date,
      score: d.score.total,
      highF: d.highF ?? null,
      precipChance: d.precipChance ?? null,
    })),
  };
}

export async function listJobs(userId: string) {
  const { companyId } = await companyScope(userId, true);
  let q = admin()
    .from("jobs")
    .select("id,title,zip,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(25);
  q = companyId ? q.eq("company_id", companyId) : q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw new McpToolError("Could not list jobs.");
  return data ?? [];
}

export async function listCustomers(userId: string) {
  const { companyId } = await companyScope(userId, true);
  let q = admin()
    .from("customers")
    .select("id,name,phone,email,address,zip")
    .order("name")
    .limit(50);
  q = companyId ? q.eq("company_id", companyId) : q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw new McpToolError("Could not list customers.");
  return data ?? [];
}

export async function listEstimates(userId: string) {
  const { companyId } = await companyScope(userId, true);
  let q = admin()
    .from("estimates")
    .select("id,number,status,zip,totals,created_at")
    .order("created_at", { ascending: false })
    .limit(25);
  q = companyId ? q.eq("company_id", companyId) : q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw new McpToolError("Could not list estimates.");
  return data ?? [];
}

export async function listNewsPosts(userId: string, includeDrafts = false) {
  const editor = await isNewsEditor(userId);
  let q = admin()
    .from("news_posts")
    .select(
      "id,slug,title_en,title_es,excerpt_en,body_en,category,published,published_at,source_url",
    )
    .order("published_at", { ascending: false })
    .limit(40);
  if (!includeDrafts || !editor) q = q.eq("published", true);
  const { data, error } = await q;
  if (error) throw new McpToolError("Could not list news.");
  return data ?? [];
}

export async function getNewsPost(slugOrId: string, userId?: string) {
  const db = admin();
  const editor = userId ? await isNewsEditor(userId) : false;
  let q = db.from("news_posts").select("*").eq("slug", slugOrId);
  if (!editor) q = q.eq("published", true);
  const bySlug = await q.maybeSingle();
  if (bySlug.data) return bySlug.data;
  let byIdQ = db.from("news_posts").select("*").eq("id", slugOrId);
  if (!editor) byIdQ = byIdQ.eq("published", true);
  const byId = await byIdQ.maybeSingle();
  if (byId.data) return byId.data;
  throw new McpToolError("News post not found.");
}

async function requireEditor(userId: string) {
  if (!(await isNewsEditor(userId))) {
    throw new McpToolError("Only PainterApps editors can change news.");
  }
}

export async function upsertNewsPost(
  userId: string,
  input: {
    id?: string;
    slug?: string;
    titleEn: string;
    titleEs?: string;
    excerptEn?: string;
    excerptEs?: string;
    bodyEn: string;
    bodyEs?: string;
    category?: string;
    published?: boolean;
    sourceUrl?: string;
  },
) {
  await requireEditor(userId);
  const titleEn = input.titleEn.trim();
  const bodyEn = input.bodyEn.trim();
  if (!titleEn || !bodyEn) throw new McpToolError("title_en and body_en are required.");
  const slug = slugify(input.slug || titleEn);
  const published = input.published !== false;
  const payload = {
    slug,
    category: input.category || "industry",
    published,
    published_at: published ? new Date().toISOString() : null,
    source_url: input.sourceUrl || null,
    title_en: titleEn,
    title_es: input.titleEs?.trim() ?? "",
    excerpt_en: input.excerptEn?.trim() ?? "",
    excerpt_es: input.excerptEs?.trim() ?? "",
    body_en: bodyEn,
    body_es: input.bodyEs?.trim() ?? "",
    author_user_id: userId,
    updated_at: new Date().toISOString(),
  };
  const db = admin();
  if (input.id) {
    const { data, error } = await db
      .from("news_posts")
      .update(payload)
      .eq("id", input.id)
      .select("id,slug,published")
      .single();
    if (error || !data) throw new McpToolError("Could not update news.");
    return data;
  }
  const { data, error } = await db
    .from("news_posts")
    .upsert(payload, { onConflict: "slug" })
    .select("id,slug,published")
    .single();
  if (error || !data) throw new McpToolError("Could not save news.");
  return data;
}

export async function deleteNewsById(userId: string, id: string) {
  await requireEditor(userId);
  const { error } = await admin().from("news_posts").delete().eq("id", id);
  if (error) throw new McpToolError("Could not delete news.");
  return { ok: true, id };
}

export async function createCustomer(
  userId: string,
  input: { name: string; phone?: string; email?: string; zip?: string; address?: string },
) {
  const name = input.name.trim();
  if (!name) throw new McpToolError("name is required.");
  const { data: profile } = await admin()
    .from("profiles")
    .select("company_id, access_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile?.access_enabled !== true) {
    throw new McpToolError("This account is disabled.");
  }
  const { data, error } = await admin()
    .from("customers")
    .insert({
      user_id: userId,
      company_id: profile?.company_id ?? null,
      name,
      phone: input.phone?.trim() ?? "",
      email: input.email?.trim() ?? "",
      zip: input.zip?.trim() ?? "",
      address: input.address?.trim() ?? "",
    })
    .select("id,name,zip")
    .single();
  if (error || !data) throw new McpToolError("Could not create customer.");
  return data;
}

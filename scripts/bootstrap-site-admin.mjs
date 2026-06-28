import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const envPath = join(root, ".env.local");

try {
  const envFile = readFileSync(envPath, "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const SITE_ADMIN_SANDBOX_SLUG = "painterapps-site-sandbox";
const SITE_ADMIN_SANDBOX_NAME = "PainterApps Site Sandbox";
const EMAIL = "steve@painterapps.com";
const FULL_NAME = "Steve";
const PASSWORD =
  process.env.SITE_ADMIN_BOOTSTRAP_PASSWORD ??
  `Pa-${randomBytes(12).toString("base64url")}!`;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match;

    if (!data.users.length || data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureSiteAdminSandbox() {
  const { data: existing, error: existingError } = await admin
    .from("companies")
    .select("*")
    .eq("slug", SITE_ADMIN_SANDBOX_SLUG)
    .maybeSingle();

  if (existingError) throw existingError;

  let company = existing;

  if (!company) {
    const { data: created, error: createError } = await admin
      .from("companies")
      .insert({
        name: SITE_ADMIN_SANDBOX_NAME,
        slug: SITE_ADMIN_SANDBOX_SLUG,
        onboarding_complete: true,
        enabled_features: ["free_tools_sell_sheets"],
      })
      .select("*")
      .single();

    if (createError) throw createError;
    company = created;
  }

  const { error: linkError } = await admin
    .from("profiles")
    .update({ company_id: company.id })
    .eq("is_site_admin", true)
    .is("company_id", null);

  if (linkError) throw linkError;

  return company;
}

async function ensureProfile(userId) {
  const { data: existing } = await admin
    .from("profiles")
    .select("id, is_site_admin")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("profiles")
      .update({ is_site_admin: true, full_name: FULL_NAME })
      .eq("id", userId);
    if (error) throw error;
    return existing;
  }

  const { error } = await admin.from("profiles").insert({
    id: userId,
    full_name: FULL_NAME,
    role: "admin",
    is_site_admin: true,
  });
  if (error) throw error;
  return null;
}

async function main() {
  let user = await findUserByEmail(EMAIL);
  let created = false;
  let password = PASSWORD;

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    });
    if (error) throw error;
    user = data.user;
    created = true;
  } else {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
      ...(process.env.SITE_ADMIN_BOOTSTRAP_PASSWORD
        ? { password: process.env.SITE_ADMIN_BOOTSTRAP_PASSWORD }
        : {}),
    });
    if (error) throw error;
    user = data.user;
    password = process.env.SITE_ADMIN_BOOTSTRAP_PASSWORD ?? "(unchanged — use existing password)";
  }

  await ensureProfile(user.id);
  const sandboxCompany = await ensureSiteAdminSandbox();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, is_site_admin, company_id")
    .eq("id", user.id)
    .single();

  if (profileError) throw profileError;

  console.log(
    JSON.stringify(
      {
        ok: true,
        created,
        email: EMAIL,
        userId: user.id,
        emailConfirmed: Boolean(user.email_confirmed_at),
        profile,
        sandboxCompany: {
          id: sandboxCompany.id,
          name: sandboxCompany.name,
          slug: sandboxCompany.slug,
        },
        password: created ? password : password,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
        adminUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app/admin`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
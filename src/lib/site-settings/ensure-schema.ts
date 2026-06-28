import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import pg from "pg";

import { createAdminClient } from "@/lib/supabase/admin";

let siteSettingsEnsured = false;

function projectRefFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

function buildDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!password || !supabaseUrl) return null;

  const ref = projectRefFromUrl(supabaseUrl);
  if (!ref) return null;

  const host = process.env.SUPABASE_DB_HOST ?? `db.${ref}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT ?? "5432";
  const user = process.env.SUPABASE_DB_USER ?? "postgres";
  const database = process.env.SUPABASE_DB_NAME ?? "postgres";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

async function siteSettingsTableReady(): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("site_settings")
    .select("id")
    .eq("id", 1)
    .maybeSingle();

  return !error;
}

async function applyMigrationFile(filename: string): Promise<void> {
  const databaseUrl = buildDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Add SUPABASE_DB_PASSWORD or DATABASE_URL to .env.local so site settings can be saved.",
    );
  }

  const sql = readFileSync(
    join(process.cwd(), "supabase", "migrations", filename),
    "utf8",
  );

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });

  try {
    await client.connect();
    await client.query(sql);
  } finally {
    await client.end();
  }
}

export async function ensureSiteSettingsSchema(): Promise<{
  ready: boolean;
  message?: string;
}> {
  if (siteSettingsEnsured) return { ready: true };

  try {
    if (!(await siteSettingsTableReady())) {
      await applyMigrationFile("021_site_settings.sql");
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not apply site settings schema.";
    return { ready: false, message };
  }

  if (!(await siteSettingsTableReady())) {
    return {
      ready: false,
      message:
        "Site settings table is missing. Run npm run db:migrate:021 or add SUPABASE_DB_PASSWORD to .env.local.",
    };
  }

  siteSettingsEnsured = true;
  return { ready: true };
}
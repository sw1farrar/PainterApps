import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import pg from "pg";

import { createAdminClient } from "@/lib/supabase/admin";

let schemaEnsured = false;
let schemaWarning: string | null = null;

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

async function productColumnsReady(): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("paint_products")
    .select("is_discontinued")
    .limit(1);

  return !error;
}

async function manufacturerLogoColumnsReady(): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("paint_manufacturers")
    .select("logo_url, logo_storage_path")
    .limit(1);

  return !error;
}

async function productAttributeColumnsReady(): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("paint_products")
    .select("resin_system, volume_solids_pct, product_uses")
    .limit(1);

  return !error;
}

async function applyMigrationFile(filename: string): Promise<void> {
  const databaseUrl = buildDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Add SUPABASE_DB_PASSWORD or DATABASE_URL to .env.local so the app can apply catalog schema updates automatically.",
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

export async function ensurePaintProductSchema(): Promise<{
  ready: boolean;
  message?: string;
}> {
  if (schemaEnsured) return { ready: true };

  try {
    if (!(await productColumnsReady())) {
      await applyMigrationFile("018_paint_product_discontinued.sql");
    }
    if (!(await manufacturerLogoColumnsReady())) {
      await applyMigrationFile("019_paint_manufacturer_logos.sql");
    }
    if (!(await productAttributeColumnsReady())) {
      await applyMigrationFile("020_paint_product_attributes.sql");
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not apply product catalog schema updates.";
    schemaWarning = message;
    return { ready: false, message };
  }

  if (
    !(await productColumnsReady()) ||
    !(await manufacturerLogoColumnsReady()) ||
    !(await productAttributeColumnsReady())
  ) {
    const message = "Could not apply required product catalog schema updates.";
    schemaWarning = message;
    return { ready: false, message };
  }

  schemaEnsured = true;
  schemaWarning = null;
  return { ready: true };
}

export async function requirePaintProductSchema(): Promise<void> {
  const result = await ensurePaintProductSchema();
  if (!result.ready) {
    throw new Error(
      result.message ??
        schemaWarning ??
        "Product catalog schema is not ready yet.",
    );
  }
}
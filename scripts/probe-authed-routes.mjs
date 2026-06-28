import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const envPath = join(root, ".env.local");

for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const supabase = createClient(url, anonKey);
const { data, error } = await supabase.auth.signInWithPassword({
  email: "steve@painterapps.com",
  password: process.env.SITE_ADMIN_BOOTSTRAP_PASSWORD || "Pa-7-FCu7FBlksBPAmz!",
});

if (error) {
  console.error("Login failed:", error.message);
  process.exit(1);
}

const projectRef = new URL(url).hostname.split(".")[0];
const cookieName = `sb-${projectRef}-auth-token`;
const sessionPayload = {
  access_token: data.session.access_token,
  refresh_token: data.session.refresh_token,
  expires_at: data.session.expires_at,
  expires_in: data.session.expires_in,
  token_type: data.session.token_type,
  user: data.user,
};
const cookie = `${cookieName}=base64-${Buffer.from(JSON.stringify(sessionPayload)).toString("base64url")}`;

const routes = [
  "/app/onboarding",
  "/app/dashboard",
  "/app/admin",
  "/app/admin/companies",
  "/app/admin/users",
  "/app/admin/product-catalog",
  "/app/sell-sheets",
  "/free-tools",
];

for (const route of routes) {
  const response = await fetch(`${base}${route}`, {
    headers: { cookie },
    redirect: "manual",
  });
  const body = await response.text();
  const snippet = body.includes("Something went wrong")
    ? "APP ERROR PAGE"
    : body.includes("Internal Server Error")
      ? "INTERNAL SERVER ERROR"
      : body.slice(0, 80).replace(/\s+/g, " ");
  console.log(`${response.status} ${route} -> ${snippet}`);
}
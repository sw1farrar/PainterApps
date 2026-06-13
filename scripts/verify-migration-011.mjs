import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const text = readFileSync(".env.local", "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

const checks = [
  {
    table: "customers",
    columns: "address_line2, city, state, zip, notes",
  },
  {
    table: "companies",
    columns: "address_line2, city, state, zip",
  },
  {
    table: "quotes",
    columns: "job_address_line2, job_city, job_state, job_zip",
  },
];

const results = [];

for (const check of checks) {
  const { error } = await supabase.from(check.table).select(check.columns).limit(1);
  results.push({
    table: check.table,
    ok: !error,
    error: error?.message ?? null,
  });
}

const missing = results.filter((r) => !r.ok);
console.log(
  JSON.stringify(
    {
      migration_011_applied: missing.length === 0,
      checks: results,
      missing_count: missing.length,
    },
    null,
    2,
  ),
);

process.exit(missing.length === 0 ? 0 : 1);
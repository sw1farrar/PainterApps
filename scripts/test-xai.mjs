import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
  console.warn("Could not read .env.local");
}

const apiKey = process.env.XAI_API_KEY?.trim();
const baseUrl = (process.env.XAI_BASE_URL || "https://api.x.ai/v1").replace(
  /\/$/,
  "",
);
const useEconomy = process.argv.includes("--economy");
const model = useEconomy
  ? "grok-build-0.1"
  : process.env.XAI_MODEL || "grok-4.3";

const checks = [];

if (!apiKey) {
  checks.push({
    test: "API key present",
    ok: false,
    detail: "XAI_API_KEY missing from .env.local",
  });
  console.log(JSON.stringify(checks, null, 2));
  process.exit(1);
}

checks.push({
  test: "API key present",
  ok: true,
  detail: `set (${apiKey.length} chars)`,
});

const response = await fetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: "Reply with exactly: ok" }],
    max_completion_tokens: 16,
    temperature: 0,
  }),
});

let payload;
try {
  payload = await response.json();
} catch {
  payload = null;
}

checks.push({
  test: "xAI chat completion",
  ok: response.ok,
  detail: response.ok
    ? `model=${payload?.model ?? model}`
    : payload?.error?.message ?? `HTTP ${response.status}`,
});

console.log(JSON.stringify(checks, null, 2));
process.exit(checks.every((check) => check.ok) ? 0 : 1);
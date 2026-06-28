#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const { downloadPaintCanImageCandidate, readImageDimensions } = await import(
  "../src/lib/sell-sheet/paint-can-image.ts"
);

const sites = [
  ["Benjamin Moore", "https://www.benjaminmoore.com"],
  ["Coronado", "https://www.coronadopaint.com"],
  ["Kelly-Moore", "https://www.kellymoore.com"],
  ["Rust-Oleum", "https://www.rustoleum.com"],
];

for (const [name, pageUrl] of sites) {
  console.log(`\n## ${name}`);
  const response = await fetch(pageUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
    redirect: "follow",
  });
  const html = await response.text();
  const urls = new Set();

  for (const match of html.matchAll(/<img[^>]+>/gi)) {
    const tag = match[0];
    const lower = tag.toLowerCase();
    if (
      !lower.includes("logo") &&
      !/alt=["'][^"']*(logo|brand)/i.test(tag)
    ) {
      continue;
    }
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    try {
      urls.add(new URL(src, pageUrl).toString());
    } catch {
      // ignore
    }
  }

  for (const match of html.matchAll(/<link[^>]+>/gi)) {
    const tag = match[0];
    if (!/icon|apple-touch/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      urls.add(new URL(href, pageUrl).toString());
    } catch {
      // ignore
    }
  }

  for (const match of html.matchAll(/https?:\/\/[^\s"'<>]+logo[^\s"'<>]*/gi)) {
    urls.add(match[0]);
  }

  for (const candidate of [...urls].slice(0, 16)) {
    const downloaded = await downloadPaintCanImageCandidate(candidate);
    if (!downloaded.success) {
      console.log("x", candidate.slice(0, 120), downloaded.error);
      continue;
    }
    const dims = readImageDimensions(downloaded.buffer, downloaded.mime);
    console.log(
      "ok",
      candidate.slice(0, 120),
      downloaded.mime,
      downloaded.buffer.byteLength,
      dims,
    );
  }
}
#!/usr/bin/env node
/**
 * Ensures sell-sheet web preview (globals.css) and PDF export stay aligned
 * with display-tokens.ts — the single source of truth.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

let failed = false;

function fail(message) {
  console.error(`✗ ${message}`);
  failed = true;
}

function pass(message) {
  console.log(`✓ ${message}`);
}

const tokens = read("src/lib/sell-sheet/display-tokens.ts");
const globals = read("src/app/globals.css");
const pdf = read("src/lib/sell-sheet/pdf-document.tsx");
const pdfLayout = read("src/lib/sell-sheet/pdf-layout.ts");

const structureVarMatch = tokens.match(
  /SELL_SHEET_STRUCTURE_CSS_VARS\s*=\s*\[([\s\S]*?)\]\s*as const/,
);
if (!structureVarMatch) {
  fail("Could not parse SELL_SHEET_STRUCTURE_CSS_VARS from display-tokens.ts");
  process.exit(1);
}

const structureVars = [
  ...structureVarMatch[1].matchAll(/"(--ss-[^"]+)"/g),
].map((m) => m[1]);

const sellSheetCssStart = globals.indexOf(".sell-sheet-preview-stage");
const sellSheetCss =
  sellSheetCssStart >= 0 ? globals.slice(sellSheetCssStart) : globals;

for (const cssVar of structureVars) {
  if (!sellSheetCss.includes(`var(${cssVar})`)) {
    fail(`globals.css sell-sheet rules missing var(${cssVar})`);
  }
}
if (!failed) {
  pass(`${structureVars.length} structural CSS vars referenced in globals.css`);
}

const styleFn = tokens.match(
  /export function sellSheetDisplayStyle\(\)[\s\S]*?return \{([\s\S]*?)\} as CSSProperties/,
);
if (!styleFn) {
  fail("Could not parse sellSheetDisplayStyle() from display-tokens.ts");
} else {
  for (const cssVar of structureVars) {
    if (!styleFn[1].includes(`"${cssVar}"`)) {
      fail(`sellSheetDisplayStyle() does not set ${cssVar}`);
    }
  }
  if (!failed) {
    pass("sellSheetDisplayStyle() defines all structural CSS vars");
  }
}

if (!pdf.includes("SELL_SHEET_COLORS")) {
  fail("pdf-document.tsx must import SELL_SHEET_COLORS from display-tokens.ts");
} else {
  pass("pdf-document.tsx imports SELL_SHEET_COLORS");
}

if (!pdf.includes("PdfSellSheetTierBanner")) {
  fail("pdf-document.tsx must render PdfSellSheetTierBanner");
} else {
  pass("pdf-document.tsx uses PdfSellSheetTierBanner");
}

const tierBannerPdf = read("src/lib/sell-sheet/pdf-tier-banner.tsx");
if (!tierBannerPdf.includes("TIER_BANNER_GRADIENTS")) {
  fail("pdf-tier-banner.tsx must use TIER_BANNER_GRADIENTS");
} else {
  pass("pdf-tier-banner.tsx uses shared tier banner gradients");
}

if (tierBannerPdf.includes("LinearGradient") || tierBannerPdf.includes("<Svg")) {
  fail("pdf-tier-banner.tsx must not use SVG gradients (corrupts PDF colors)");
} else {
  pass("pdf-tier-banner.tsx avoids SVG gradients");
}

if (tierBannerPdf.includes("zIndex")) {
  fail("pdf-tier-banner.tsx must not use zIndex (react-pdf paints higher z behind)");
} else {
  pass("pdf-tier-banner.tsx avoids zIndex stacking bugs");
}

const pdfFonts = read("src/lib/sell-sheet/pdf-fonts.ts");
if (!pdfFonts.includes("/fonts/source-sans-3")) {
  fail("pdf-fonts.ts must load Source Sans 3 from /public/fonts");
} else {
  pass("pdf-fonts.ts loads local Source Sans 3 fonts");
}

if (!pdfLayout.includes("buildSellSheetPdfLayout")) {
  fail("pdf-layout.ts must derive from buildSellSheetPdfLayout()");
} else {
  pass("pdf-layout.ts derives from display-tokens");
}

const preview = read("src/components/sell-sheet/SellSheetPreview.tsx");
if (!preview.includes("sellSheetDisplayStyle")) {
  fail("SellSheetPreview.tsx must apply sellSheetDisplayStyle()");
} else {
  pass("SellSheetPreview.tsx applies sellSheetDisplayStyle()");
}

const driftPatterns = [
  { file: pdf, label: "pdf-document.tsx", patterns: ["#f5faff", "#0a1428", "#eef6ff"] },
];
for (const { file, label, patterns } of driftPatterns) {
  for (const hex of patterns) {
    if (file.includes(hex)) {
      fail(`${label} contains drift color ${hex} — use SELL_SHEET_COLORS instead`);
    }
  }
}
if (!failed) {
  pass("No known drift colors in PDF document");
}

// Spot-check a few token values propagate to PDF layout builder
const layoutInMatch = tokens.match(
  /export const SELL_SHEET_LAYOUT_IN = \{([\s\S]*?)\} as const/,
);
if (layoutInMatch) {
  const columnPaddingTop = layoutInMatch[1].match(
    /columnPaddingTop:\s*([\d.]+)/,
  )?.[1];
  if (columnPaddingTop) {
    const expectedPt = String(Number(columnPaddingTop) * 72);
    if (!tokens.includes(`paddingTop: pt(L.columnPaddingTop)`)) {
      fail("buildSellSheetPdfLayout() should map columnPaddingTop via pt()");
    } else if (!tokens.includes(`"--ss-column-padding-top": inVar(L.columnPaddingTop)`)) {
      fail("sellSheetDisplayStyle() should map columnPaddingTop to CSS var");
    } else {
      pass(`column padding top (${columnPaddingTop}in → ${expectedPt}pt) wired in tokens`);
    }
  }
}

process.exit(failed ? 1 : 0);
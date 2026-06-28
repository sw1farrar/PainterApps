#!/usr/bin/env node
/**
 * Ensures product marketing sheet web preview and PDF export stay aligned
 * with product-marketing-sheet-display-tokens.ts.
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

const tokens = read(
  "src/lib/product-catalog/product-marketing-sheet-display-tokens.ts",
);
const globals = read("src/app/globals.css");
const pdf = read("src/lib/product-catalog/product-marketing-sheet-pdf.tsx");
const preview = read("src/components/admin/ProductMarketingSheetPreview.tsx");

const structureVarMatch = tokens.match(
  /PRODUCT_MARKETING_SHEET_STRUCTURE_CSS_VARS\s*=\s*\[([\s\S]*?)\]\s*as const/,
);
if (!structureVarMatch) {
  fail(
    "Could not parse PRODUCT_MARKETING_SHEET_STRUCTURE_CSS_VARS from display-tokens.ts",
  );
  process.exit(1);
}

const structureVars = [
  ...structureVarMatch[1].matchAll(/"(--pms-[^"]+)"/g),
].map((m) => m[1]);

const pmsCssStart = globals.indexOf(".product-marketing-sheet");
const pmsCss = pmsCssStart >= 0 ? globals.slice(pmsCssStart) : globals;

for (const cssVar of structureVars) {
  if (!pmsCss.includes(cssVar)) {
    fail(`globals.css product-marketing-sheet rules missing ${cssVar}`);
  }
}
if (!failed) {
  pass(`${structureVars.length} structural CSS vars referenced in globals.css`);
}

const styleFn = tokens.match(
  /export function productMarketingSheetDisplayStyle\(\)[\s\S]*?return \{([\s\S]*?)\} as CSSProperties/,
);
if (!styleFn) {
  fail("Could not parse productMarketingSheetDisplayStyle() from display-tokens.ts");
} else {
  for (const cssVar of structureVars) {
    if (!styleFn[1].includes(`"${cssVar}"`)) {
      fail(`productMarketingSheetDisplayStyle() does not set ${cssVar}`);
    }
  }
  if (!failed) {
    pass("productMarketingSheetDisplayStyle() defines all structural CSS vars");
  }
}

if (!preview.includes("productMarketingSheetDisplayStyle")) {
  fail("ProductMarketingSheetPreview must apply productMarketingSheetDisplayStyle()");
} else {
  pass("ProductMarketingSheetPreview applies display tokens");
}

if (!pdf.includes("buildProductMarketingSheetPdfLayout")) {
  fail("product-marketing-sheet-pdf.tsx must use buildProductMarketingSheetPdfLayout()");
} else {
  pass("PDF document derives layout from display tokens");
}

if (!tokens.includes("PMS_LAYOUT_REM")) {
  fail("PDF layout must derive from PMS_LAYOUT_REM web tokens");
} else if (tokens.includes("PMS_PDF_LAYOUT_REM")) {
  fail("Remove PDF-only layout overrides; use PMS_PDF_UNIFORM_SCALE on web tokens");
} else if (!tokens.includes("PMS_PDF_UNIFORM_SCALE = 1")) {
  fail("PMS_PDF_UNIFORM_SCALE must be 1 so PDF sizing matches the web sheet at print scale");
} else {
  pass("PDF uses 1:1 web layout tokens on letter portrait");
}

if (!pdf.includes('orientation="portrait"')) {
  fail('PDF Page must set orientation="portrait"');
} else {
  pass("PDF page orientation is portrait");
}

if (pdf.includes("pdfClampDescription") || pdf.includes("columns3")) {
  fail("PDF must not use compact-only layout shortcuts diverging from web preview");
}

if (!pdf.includes("headerAside")) {
  fail("PDF header must mirror web pms-header-aside (logo left, name right)");
}

if (!pdf.includes("Attribute source")) {
  fail("PDF meta block must include Attribute source like the web preview");
}

if (pdf.includes("footerMeta")) {
  fail("PDF must not relocate meta fields into the footer");
}

const sectionTitles = [
  "Sheen options",
  "Product capabilities",
  "Product uses",
  "Substrates",
  "Recommended uses",
  "Paint system features",
  "Coating specifications",
  "Catalog data status",
];

for (const sectionTitle of sectionTitles) {
  if (!preview.includes(sectionTitle)) {
    fail(`ProductMarketingSheetPreview must render ${sectionTitle} section`);
  }
  if (!pdf.includes(sectionTitle)) {
    fail(`PDF must render ${sectionTitle} section like the web preview`);
  }
}

if (!pdf.includes("twoColumn")) {
  fail("PDF must render two-column feature lists");
}

if (failed) {
  process.exit(1);
}

console.log("✓ Product marketing sheet preview/PDF parity checks passed");
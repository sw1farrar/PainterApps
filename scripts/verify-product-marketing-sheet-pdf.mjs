#!/usr/bin/env node
/**
 * Renders a product marketing sheet PDF smoke test (layout + page count).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import {
  buildProductMarketingSheetPdfLayout,
  PMS_PAGE,
  PMS_PDF_UNIFORM_SCALE,
} from "../src/lib/product-catalog/product-marketing-sheet-display-tokens.ts";
import { ProductMarketingSheetPdfDocument } from "../src/lib/product-catalog/product-marketing-sheet-pdf.tsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

Font.register({
  family: "Source Sans 3",
  fonts: [
    {
      src: join(root, "public/fonts/source-sans-3-latin-600-normal.woff"),
      fontWeight: 400,
    },
    {
      src: join(root, "public/fonts/source-sans-3-latin-600-normal.woff"),
      fontWeight: 600,
    },
    {
      src: join(root, "public/fonts/source-sans-3-latin-800-normal.woff"),
      fontWeight: 800,
    },
  ],
});

const L = buildProductMarketingSheetPdfLayout();
const pageRatio = PMS_PAGE.widthIn / PMS_PAGE.heightIn;

function countPdfPages(buffer) {
  const text = buffer.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : 0;
}

const sampleView = {
  id: "test",
  manufacturerName: "Minwax",
  manufacturerLogoUrl: null,
  productName:
    "Professional Interior Water-Based Acrylic-Latex Enamel Paint and Primer in One",
  applicationLabel: "Interior",
  categoryLabel: "Paint",
  baseLabel: "Water-based",
  resinType: "Acrylic",
  resinSystemLabel: "100% Acrylic",
  productUses: ["Walls", "Trim", "Doors", "Cabinets"],
  substrates: ["Drywall", "Wood", "Previously Painted"],
  vocLevelLabel: "Low VOC",
  volumeSolidsLabel: "42%",
  productCapabilities: ["Self-priming", "Scrubbable", "Mold & mildew resistant"],
  recommendedUses: ["Living areas", "Kitchens", "Bathrooms", "Hallways"],
  description:
    "A durable, low-odor coating engineered for high-traffic residential and light commercial interiors. " +
    "Delivers excellent hide, flow, and leveling with outstanding adhesion to properly prepared drywall, " +
    "wood, and previously painted surfaces. Resists scuffs, stains, and frequent cleaning while maintaining " +
    "a uniform sheen profile across multiple finish levels.",
  sheenOptions: ["Flat", "Eggshell", "Satin", "Semi-Gloss", "High-Gloss"],
  paintSystemFeatures: [
    "One-coat hide over most colors",
    "Low-VOC formula",
    "Soap and water cleanup",
    "Mildew-resistant film",
    "Block-resistant finish",
    "Excellent flow and leveling",
    "Quick return to service",
    "Tintable to deep bases",
    "Primerless on most substrates",
    "Scuff-resistant enamel",
    "Stain-blocking technology",
    "UV-resistant colorants",
  ],
  paintSystemFeatureOptions: [
    "Dry to touch: 1 hour",
    "Recoat: 4 hours",
    "Full cure: 7 days",
    "Coverage: 350–400 sq ft/gal",
    "Application: brush, roll, spray",
    "Thinning: clean water up to 10%",
    "Temperature: 50–90°F",
    "Humidity: below 85%",
    "VOC: less than 50 g/L",
    "Solids by volume: 42%",
  ],
  canImageUrl: null,
  isDiscontinued: false,
  enrichmentStatus: "complete",
  sourceUrl:
    "https://www.minwax.com/products/interior/professional-water-based-acrylic-latex-enamel",
  attributeSourceUrl:
    "https://www.minwax.com/products/interior/professional-water-based-acrylic-latex-enamel",
};

const buffer = await renderToBuffer(
  React.createElement(ProductMarketingSheetPdfDocument, { view: sampleView }),
);
const pages = countPdfPages(buffer);

if (pages !== 1) {
  console.error(`✗ Expected exactly 1 PDF page, got ${pages}`);
  process.exit(1);
}

const layoutPageRatio = L.page.width / L.page.height;
if (Math.abs(layoutPageRatio - pageRatio) > 0.001) {
  console.error(
    `✗ PDF page ratio ${layoutPageRatio.toFixed(4)} must match letter portrait ${pageRatio.toFixed(4)} (${PMS_PAGE.widthIn}×${PMS_PAGE.heightIn} in)`,
  );
  process.exit(1);
}

if (PMS_PDF_UNIFORM_SCALE !== 1) {
  console.error(
    `✗ PMS_PDF_UNIFORM_SCALE must be 1 for 1:1 web preview sizing (got ${PMS_PDF_UNIFORM_SCALE})`,
  );
  process.exit(1);
}

console.log(`✓ Product marketing sheet PDF renders (${pages} page${pages === 1 ? "" : "s"})`);
console.log(
  `  Page: ${PMS_PAGE.widthIn}×${PMS_PAGE.heightIn} in portrait (${L.page.width}×${L.page.height} pt), scale ${PMS_PDF_UNIFORM_SCALE}`,
);
console.log(
  `  Layout: logo max ${L.logo.maxWidth}×${L.logo.maxHeight}pt, can ${L.canWrap.imageWidth.toFixed(1)}×${L.canWrap.imageHeight.toFixed(1)}pt`,
);
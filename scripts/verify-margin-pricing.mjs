import {
  grossMarginPctFromParts,
  lineItemLineTotal,
  markupAmountFromMargin,
  sellPriceFromMargin,
} from "../src/lib/quotes/pricing.ts";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

function approx(a, b, tolerance = 0.05) {
  return Math.abs(a - b) <= tolerance;
}

// 25% gross margin on $100 cost → $133.33 sell, $33.33 profit
const sell100 = sellPriceFromMargin(100, 25);
assert(approx(sell100, 133.33), `25% margin sell price is $133.33 (got ${sell100})`);

const profit100 = markupAmountFromMargin(100, 25);
assert(approx(profit100, 33.33), `25% margin profit is $33.33 (got ${profit100})`);

const marginOnSell = grossMarginPctFromParts(100, sell100);
assert(approx(marginOnSell, 25), `Displayed margin is 25% (got ${marginOnSell}%)`);

// Uniform 25% across multiple work items blends to 25% on the area row
const items = [
  { qty: 1, unit_cost: 800, markup: 25 },
  { qty: 1, unit_cost: 200, markup: 25 },
];
const totalCost = 1000;
const totalSell = items.reduce((sum, item) => sum + lineItemLineTotal(item), 0);
const blended = grossMarginPctFromParts(totalCost, totalSell);
assert(approx(blended, 25), `Blended area margin is 25% (got ${blended}%)`);

// Line item total matches sell-from-margin
const lineTotal = lineItemLineTotal({ qty: 2, unit_cost: 50, markup: 25 });
assert(approx(lineTotal, 133.33), `Line item total uses margin formula (got ${lineTotal})`);

if (process.exitCode) {
  console.error("\nMargin pricing verification failed.");
  process.exit(1);
}

console.log("\nAll margin pricing checks passed.");
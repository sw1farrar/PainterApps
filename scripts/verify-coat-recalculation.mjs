import {
  clearDerivedSurfaceEstimates,
  resolveGallonsForSurface,
  resolveLaborHoursForSurface,
} from "../src/lib/quotes/surface-overrides.ts";
import { computeSurfaceGallons } from "../src/lib/quotes/surface-gallons.ts";
import { estimateSurfaceLaborHours } from "../src/lib/quotes/surface-productivity.ts";

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

const company = {
  coverage_sqft_per_gallon: 350,
  material_waste_pct: 10,
  surface_labor_defaults: null,
  labor_rates: { painter: 45, prep: 40 },
  avg_labor_cost_per_hour: 45,
};

const product = {
  unit_cost: 45,
  coverage_sqft_per_gallon: 350,
};

const surface2Coat = {
  surface_type: "wall",
  rate_type: "sqft",
  sq_ft: 400,
  coats: 2,
  notes: "labor_hours:2\ngallons:3",
};

const cleared = clearDerivedSurfaceEstimates(surface2Coat.notes);
assert(
  cleared == null || !cleared.includes("labor_hours"),
  "clearDerivedSurfaceEstimates removes labor_hours override",
);
assert(
  cleared == null || !cleared.includes("gallons"),
  "clearDerivedSurfaceEstimates removes gallons override",
);

const labor2 = resolveLaborHoursForSurface(
  { ...surface2Coat, notes: null },
  "interior",
  null,
);
const labor3 = resolveLaborHoursForSurface(
  { ...surface2Coat, coats: 3, notes: null },
  "interior",
  null,
);
assert(
  labor3 > labor2,
  `Labor scales up with coats (${labor2} hr → ${labor3} hr)`,
);

const gallons2 = resolveGallonsForSurface(
  { ...surface2Coat, notes: null },
  product,
  company,
  "interior",
);
const gallons3 = resolveGallonsForSurface(
  { ...surface2Coat, coats: 3, notes: null },
  product,
  company,
  "interior",
);
assert(
  gallons3 > gallons2,
  `Gallons scale up with coats (${gallons2} → ${gallons3} gal)`,
);

const direct2 = computeSurfaceGallons(400, 2, "sqft", product, company, {
  surfaceType: "wall",
  jobType: "interior",
});
const direct4 = computeSurfaceGallons(400, 4, "sqft", product, company, {
  surfaceType: "wall",
  jobType: "interior",
});
assert(
  approx(direct4, direct2 * 2),
  `Material gallons are proportional to coat count (${direct2} → ${direct4})`,
);

const est2 = estimateSurfaceLaborHours(
  { surface_type: "wall", rate_type: "sqft", sq_ft: 400, coats: 2 },
  "interior",
);
const est4 = estimateSurfaceLaborHours(
  { surface_type: "wall", rate_type: "sqft", sq_ft: 400, coats: 4 },
  "interior",
);
assert(
  approx(est4, est2 * 2, 0.1),
  `Painting hours scale with coats on 2-coat basis (${est2} → ${est4} hr)`,
);

if (process.exitCode) {
  console.error("\nCoat recalculation verification failed.");
  process.exit(1);
}

console.log("\nAll coat recalculation checks passed.");
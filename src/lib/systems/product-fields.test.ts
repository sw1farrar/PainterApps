import { describe, expect, it } from "vitest";
import {
  productPatchFromArgs,
  productRowToMcp,
} from "./product-fields";

describe("productPatchFromArgs", () => {
  it("only includes provided typed fields and does not invent numbers", () => {
    const patch = productPatchFromArgs({
      id: "bm-aura-ext",
      volume_solids_pct: 38,
      notes: "from TDS",
    });
    expect(patch.volume_solids_pct).toBe(38);
    expect(patch.notes).toBe("from TDS");
    expect(patch.min_temp_f).toBeUndefined();
    expect(patch.coverage_sqft_gal_min).toBeUndefined();
    expect(patch.id).toBeUndefined();
  });

  it("clears a typed field with empty string", () => {
    const patch = productPatchFromArgs({ resin_type: "" });
    expect(patch.resin_type).toBeNull();
  });
});

describe("productRowToMcp", () => {
  it("returns snake_case columns plus attrs", () => {
    const row = productRowToMcp({
      id: "bm-aura-ext",
      manufacturer_id: "bm",
      name: "Aura Exterior",
      sku: "632",
      kind: "topcoat",
      volume_solids_pct: 38,
      attrs: { vapor_perms: 46.2 },
    });
    expect(row.id).toBe("bm-aura-ext");
    expect(row.volume_solids_pct).toBe(38);
    expect(row.coverage_sqft_gal_min).toBeNull();
    expect((row.attrs as { vapor_perms: number }).vapor_perms).toBe(46.2);
  });
});

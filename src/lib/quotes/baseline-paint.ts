import type { TierPaintConfigInput } from "@/lib/paint-library/types";
import type { QuotePaintDefaultInput } from "@/lib/quotes/paint-defaults";
import { normalizeQuotePaintDefaults } from "@/lib/quotes/paint-defaults";
import type { QuoteJobType, QuoteSurfaceKind } from "@/types/database";

export type BaselineApplicationScope = "interior" | "exterior";

export type BaselineSurfaceCategory = "wall" | "trim" | "door" | "ceiling";

export type BaselinePaintSystemInput = {
  application_scope: BaselineApplicationScope;
  surface_category: BaselineSurfaceCategory;
  primer_product_id: string | null;
  topcoat_product_id: string | null;
  primer_coats: number;
  topcoat_coats: number;
  primer_spot_prime: boolean;
};

export const BASELINE_SURFACE_CATEGORIES: {
  key: BaselineSurfaceCategory;
  label: string;
}[] = [
  { key: "wall", label: "Walls" },
  { key: "trim", label: "Trim" },
  { key: "door", label: "Doors" },
  { key: "ceiling", label: "Ceilings" },
];

export const BASELINE_SCOPE_LABELS: Record<BaselineApplicationScope, string> = {
  interior: "Interior",
  exterior: "Exterior",
};

const CATEGORY_TO_SURFACE_KIND: Record<
  BaselineSurfaceCategory,
  QuoteSurfaceKind
> = {
  wall: "wall",
  trim: "trim",
  door: "door",
  ceiling: "ceiling",
};

export function baselineScopesForJobType(
  jobType: QuoteJobType,
): BaselineApplicationScope[] {
  if (jobType === "exterior") return ["exterior"];
  if (jobType === "both") return ["interior", "exterior"];
  return ["interior"];
}

export function baselineStepTitle(_jobType: QuoteJobType): string {
  return "Paint systems";
}

export function emptyBaselinePaintSystems(
  jobType: QuoteJobType,
): BaselinePaintSystemInput[] {
  return baselineScopesForJobType(jobType).flatMap((application_scope) =>
    BASELINE_SURFACE_CATEGORIES.map(({ key: surface_category }) => ({
      application_scope,
      surface_category,
      primer_product_id: null,
      topcoat_product_id: null,
      primer_coats: 1,
      topcoat_coats: 2,
      primer_spot_prime: false,
    })),
  );
}

export function normalizeBaselinePaintSystems(
  rows: BaselinePaintSystemInput[] | null | undefined,
  jobType: QuoteJobType,
): BaselinePaintSystemInput[] {
  const template = emptyBaselinePaintSystems(jobType);
  const byKey = new Map(
    (rows ?? []).map((row) => [
      `${row.application_scope}:${row.surface_category}`,
      row,
    ]),
  );

  return template.map((slot) => {
    const existing = byKey.get(`${slot.application_scope}:${slot.surface_category}`);
    if (!existing) return slot;
    return {
      ...slot,
      primer_product_id: existing.primer_product_id ?? null,
      topcoat_product_id: existing.topcoat_product_id ?? null,
      primer_coats: existing.primer_coats || 1,
      topcoat_coats: existing.topcoat_coats || 2,
      primer_spot_prime: existing.primer_spot_prime ?? false,
    };
  });
}

/** Primary scope used when cascading baseline into per-area paint defaults. */
export function primaryBaselineScope(
  jobType: QuoteJobType,
): BaselineApplicationScope {
  if (jobType === "exterior") return "exterior";
  return "interior";
}

export function baselineSystemsToPaintDefaults(
  systems: BaselinePaintSystemInput[],
  jobType: QuoteJobType,
): QuotePaintDefaultInput[] {
  const scope = primaryBaselineScope(jobType);
  const scoped = systems.filter((row) => row.application_scope === scope);
  const base = normalizeQuotePaintDefaults([]);

  return base.map((row) => {
    const category = Object.entries(CATEGORY_TO_SURFACE_KIND).find(
      ([, kind]) => kind === row.surface_type,
    )?.[0] as BaselineSurfaceCategory | undefined;
    if (!category) return row;
    const match = scoped.find((s) => s.surface_category === category);
    if (!match?.topcoat_product_id) return row;
    return {
      ...row,
      company_paint_product_id: match.topcoat_product_id,
      coats: match.topcoat_coats || row.coats,
    };
  });
}

export function isBaselineConfigured(
  systems: BaselinePaintSystemInput[],
  jobType: QuoteJobType,
): boolean {
  const scope = primaryBaselineScope(jobType);
  const wall = systems.find(
    (row) =>
      row.application_scope === scope && row.surface_category === "wall",
  );
  return Boolean(wall?.topcoat_product_id);
}

export function baselineRowKey(
  scope: BaselineApplicationScope,
  category: BaselineSurfaceCategory,
): string {
  return `${scope}:${category}`;
}

export function goodTierPaintFromBaselineForScope(
  systems: BaselinePaintSystemInput[],
  scope: BaselineApplicationScope,
): Pick<
  TierPaintConfigInput,
  | "primer_product_id"
  | "topcoat_product_id"
  | "primer_coats"
  | "topcoat_coats"
  | "primer_spot_prime"
> {
  const wall = systems.find(
    (row) =>
      row.application_scope === scope && row.surface_category === "wall",
  );
  return {
    primer_product_id: wall?.primer_product_id ?? null,
    topcoat_product_id: wall?.topcoat_product_id ?? null,
    primer_coats: wall?.primer_coats ?? 1,
    topcoat_coats: wall?.topcoat_coats ?? 2,
    primer_spot_prime: wall?.primer_spot_prime ?? false,
  };
}

export function goodTierPaintFromBaseline(
  systems: BaselinePaintSystemInput[],
  jobType: QuoteJobType,
): Pick<
  TierPaintConfigInput,
  | "primer_product_id"
  | "topcoat_product_id"
  | "primer_coats"
  | "topcoat_coats"
  | "primer_spot_prime"
> {
  return goodTierPaintFromBaselineForScope(
    systems,
    primaryBaselineScope(jobType),
  );
}
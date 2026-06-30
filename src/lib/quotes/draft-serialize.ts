import type { QuoteDraftInput } from "@/app/app/(portal)/quotes/actions";
import { normalizeBaselinePaintSystems } from "@/lib/quotes/baseline-paint";
import { normalizeQuotePaintDefaults } from "@/lib/quotes/paint-defaults";
import type { QuoteJobType } from "@/types/database";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundGallons(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function normalizeString(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Stable snapshot for dirty-checking — ignores DB ids that change after each save. */
export function serializeQuoteDraftForCompare(draft: QuoteDraftInput): string {
  const header = draft.header
    ? {
        customer_id: draft.header.customer_id,
        name: draft.header.name ?? null,
        job_type: draft.header.job_type,
        estimation_mode: draft.header.estimation_mode,
        custom_message: draft.header.custom_message ?? null,
        job_address: normalizeString(draft.header.job_address),
        job_address_line2: normalizeString(draft.header.job_address_line2),
        job_city: normalizeString(draft.header.job_city),
        job_state: normalizeString(draft.header.job_state),
        job_zip: normalizeString(draft.header.job_zip),
        before_photos: draft.header.before_photos ?? [],
      }
    : undefined;

  const rooms = (draft.rooms ?? [])
    .map((room, index) => ({
      name: normalizeString(room.name),
      surface_type: room.surface_type || "drywall",
      condition: room.condition || "good",
      sq_ft: room.sq_ft || 0,
      color_codes: normalizeString(room.color_codes),
      coats: room.coats || 2,
      prep_work: normalizeString(room.prep_work),
      sort_order: room.sort_order ?? index,
      photo_url: room.photo_url ?? null,
      is_optional: room.is_optional ?? false,
      length_ft: room.length_ft ?? null,
      width_ft: room.width_ft ?? null,
      height_ft: room.height_ft ?? null,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  const surfaces = (draft.surfaces ?? [])
    .map((surface, index) => ({
      room_index: surface.room_index,
      surface_key: surface.surface_key ?? null,
      surface_type: surface.surface_type ?? "wall",
      sq_ft: surface.sq_ft || 0,
      coats: surface.coats || 2,
      unit_rate: roundMoney(surface.unit_rate || 0),
      rate_type: surface.rate_type ?? "sqft",
      notes: normalizeString(surface.notes),
      is_optional: surface.is_optional ?? false,
      sort_order: surface.sort_order ?? index,
      company_paint_product_id: surface.company_paint_product_id ?? null,
      product_override: surface.product_override ?? false,
      gallons_estimated:
        surface.gallons_estimated != null
          ? roundGallons(surface.gallons_estimated)
          : null,
    }))
    .sort((a, b) => {
      const roomDelta = (a.room_index ?? 0) - (b.room_index ?? 0);
      if (roomDelta !== 0) return roomDelta;
      return a.sort_order - b.sort_order;
    });

  const baselinePaintSystems = normalizeBaselinePaintSystems(
    draft.baselinePaintSystems ?? [],
    (draft.header?.job_type as QuoteJobType | undefined) ?? "interior",
  ).map((row) => ({
    application_scope: row.application_scope,
    surface_category: row.surface_category,
    primer_product_id: row.primer_product_id ?? null,
    topcoat_product_id: row.topcoat_product_id ?? null,
    primer_coats: row.primer_coats || 1,
    topcoat_coats: row.topcoat_coats || 2,
    primer_spot_prime: row.primer_spot_prime ?? false,
  }));

  const paintDefaults = normalizeQuotePaintDefaults(draft.paintDefaults).map(
    (row) => ({
      surface_type: row.surface_type,
      company_paint_product_id: row.company_paint_product_id ?? null,
      coats: row.coats || 2,
    }),
  );

  const lineItems = (draft.lineItems ?? [])
    .map((item, index) => ({
      type: item.type,
      description: normalizeString(item.description),
      qty: item.qty || 1,
      unit_cost: roundMoney(item.unit_cost || 0),
      markup: roundMoney(item.markup || 0),
      source: item.source ?? "manual",
      room_index: item.room_index,
      is_optional: item.is_optional ?? false,
      sort_order: item.sort_order ?? index,
      company_paint_product_id: item.company_paint_product_id ?? null,
      paint_role: item.paint_role ?? null,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  const tierPaintConfig = (draft.tierPaintConfig ?? []).map((row) => ({
    tier: row.tier,
    primer_product_id: row.primer_product_id ?? null,
    topcoat_product_id: row.topcoat_product_id ?? null,
    primer_coats: row.primer_coats ?? 1,
    topcoat_coats: row.topcoat_coats ?? 2,
    primer_spot_prime: row.primer_spot_prime ?? false,
    labor_hours_delta_pct: roundMoney(row.labor_hours_delta_pct ?? 0),
    labor_hours_delta_hours: roundMoney(row.labor_hours_delta_hours ?? 0),
    prep_hours_delta: roundMoney(row.prep_hours_delta ?? 0),
    value_add_features: [...(row.value_add_features ?? [])],
  }));

  const tiers = (draft.tiers ?? []).map((tier) => ({
    tier: tier.tier,
    price: roundMoney(tier.price || 0),
    margin: roundMoney(tier.margin || 0),
    features: [...(tier.features ?? [])],
    benefits: [...(tier.benefits ?? [])],
    display_name: tier.display_name?.trim() || null,
  }));

  return JSON.stringify({
    header,
    rooms,
    surfaces,
    lineItems,
    tiers,
    tierPaintConfig,
    paintDefaults,
    baselinePaintSystems,
  });
}
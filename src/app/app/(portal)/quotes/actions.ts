"use server";

import { revalidatePath } from "next/cache";
import {
  quoteAcceptedEmail,
  quoteDeclinedEmail,
  quoteSentEmail,
  sendEmail,
} from "@/lib/email";
import { createNotification } from "@/lib/notifications/create";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOnboarded } from "@/lib/auth/session";
import { formatJobAddress } from "@/lib/address";
import { formatCurrency } from "@/lib/utils";
import { formatQuoteTierLabel } from "@/lib/quotes/tier-labels";
import type { TierPaintConfigInput } from "@/lib/paint-library/types";
import {
  normalizeBaselinePaintSystems,
  type BaselinePaintSystemInput,
} from "@/lib/quotes/baseline-paint";
import {
  normalizeQuotePaintDefaults,
  type QuotePaintDefaultInput,
} from "@/lib/quotes/paint-defaults";
import type {
  LineItemType,
  Quote,
  QuoteEstimationMode,
  QuoteJobType,
  QuoteLineItem,
  QuoteLineItemSource,
  QuoteRateType,
  QuoteRoom,
  QuoteSurface,
  QuoteSurfaceKind,
  QuoteTemplate,
  QuoteTier,
  QuoteTierName,
  QuoteTierPaintConfig,
} from "@/types/database";

export type RoomInput = Omit<QuoteRoom, "id" | "quote_id"> & { id?: string };
export type SurfaceInput = Omit<
  QuoteSurface,
  | "id"
  | "quote_id"
  | "room_id"
  | "company_paint_product_id"
  | "product_override"
  | "gallons_estimated"
  | "surface_key"
> & {
  id?: string;
  room_id?: string;
  room_index?: number;
  company_paint_product_id?: string | null;
  product_override?: boolean;
  gallons_estimated?: number | null;
  surface_key?: string | null;
};
export type LineItemInput = Omit<QuoteLineItem, "id" | "quote_id"> & {
  id?: string;
  room_index?: number;
};
export type TierInput = Omit<QuoteTier, "id" | "quote_id" | "display_name"> & {
  id?: string;
  display_name?: string | null;
};

export type { BaselinePaintSystemInput };

export type QuoteHeaderInput = {
  customer_id?: string;
  name?: string | null;
  job_type?: QuoteJobType;
  estimation_mode?: QuoteEstimationMode;
  custom_message?: string | null;
  before_photos?: string[];
} & Partial<JobAddressInput>;

export type QuoteDraftInput = {
  header?: QuoteHeaderInput;
  rooms?: RoomInput[];
  surfaces?: SurfaceInput[];
  lineItems?: LineItemInput[];
  tiers?: TierInput[];
  tierPaintConfig?: TierPaintConfigInput[];
  paintDefaults?: QuotePaintDefaultInput[];
  baselinePaintSystems?: BaselinePaintSystemInput[];
};

export type { TierPaintConfigInput, QuotePaintDefaultInput };

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getCompanyId() {
  const { company } = await requireOnboarded();
  if (!company) throw new Error("Company not found");
  return company.id;
}

async function verifyCustomerBelongsToCompany(
  customerId: string,
  companyId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("company_id", companyId)
    .maybeSingle();
  return Boolean(data);
}

type JobAddressInput = {
  job_address: string;
  job_address_line2?: string | null;
  job_city?: string | null;
  job_state?: string | null;
  job_zip?: string | null;
};

function normalizeJobAddressInput(
  input: Partial<JobAddressInput>,
): Partial<JobAddressInput> {
  const normalized: Partial<JobAddressInput> = { ...input };

  if (input.job_address !== undefined) {
    normalized.job_address = input.job_address.trim();
  }
  if (input.job_address_line2 !== undefined) {
    normalized.job_address_line2 = input.job_address_line2?.trim() || null;
  }
  if (input.job_city !== undefined) {
    normalized.job_city = input.job_city?.trim() || null;
  }
  if (input.job_state !== undefined) {
    normalized.job_state = input.job_state?.trim() || null;
  }
  if (input.job_zip !== undefined) {
    normalized.job_zip = input.job_zip?.trim() || null;
  }

  return normalized;
}

export async function createQuote(
  input: JobAddressInput & {
    customer_id: string;
    before_photos?: string[];
    name?: string | null;
    job_type?: QuoteJobType;
    estimation_mode?: QuoteEstimationMode;
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    if (!(await verifyCustomerBelongsToCompany(input.customer_id, companyId))) {
      return { success: false, error: "Customer not found" };
    }

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        company_id: companyId,
        customer_id: input.customer_id,
        job_address: input.job_address.trim(),
        job_address_line2: input.job_address_line2?.trim() || null,
        job_city: input.job_city?.trim() || null,
        job_state: input.job_state?.trim() || null,
        job_zip: input.job_zip?.trim() || null,
        before_photos: input.before_photos ?? [],
        name: input.name?.trim() || null,
        job_type: input.job_type ?? "interior",
        estimation_mode: input.estimation_mode ?? "hybrid",
        status: "draft",
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/quotes");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create quote",
    };
  }
}

export async function updateQuote(
  quoteId: string,
  input: QuoteHeaderInput,
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    if (input.customer_id !== undefined) {
      if (
        !(await verifyCustomerBelongsToCompany(input.customer_id, companyId))
      ) {
        return { success: false, error: "Customer not found" };
      }
    }

    const { error } = await supabase
      .from("quotes")
      .update({
        ...normalizeJobAddressInput(input),
        ...(input.customer_id !== undefined
          ? { customer_id: input.customer_id }
          : {}),
        ...(input.name !== undefined ? { name: input.name?.trim() || null } : {}),
        ...(input.job_type !== undefined ? { job_type: input.job_type } : {}),
        ...(input.estimation_mode !== undefined
          ? { estimation_mode: input.estimation_mode }
          : {}),
        ...(input.custom_message !== undefined
          ? { custom_message: input.custom_message?.trim() || null }
          : {}),
        ...(input.before_photos !== undefined
          ? { before_photos: input.before_photos }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .eq("company_id", companyId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update quote",
    };
  }
}

/** @deprecated Use saveQuoteDraft — partial saves orphan surfaces and line items. */
export async function saveRooms(
  quoteId: string,
  rooms: RoomInput[],
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (!quote) return { success: false, error: "Quote not found" };

    await supabase.from("quote_rooms").delete().eq("quote_id", quoteId);

    if (rooms.length > 0) {
      const { error } = await supabase.from("quote_rooms").insert(
        rooms.map((room, index) => ({
          quote_id: quoteId,
          name: room.name,
          surface_type: room.surface_type || "drywall",
          condition: room.condition || "good",
          sq_ft: room.sq_ft || 0,
          color_codes: room.color_codes || "",
          coats: room.coats || 2,
          prep_work: room.prep_work || "",
          sort_order: room.sort_order ?? index,
          photo_url: room.photo_url ?? null,
          is_optional: room.is_optional ?? false,
          length_ft: room.length_ft ?? null,
          width_ft: room.width_ft ?? null,
          height_ft: room.height_ft ?? null,
        })),
      );
      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save rooms",
    };
  }
}

/** @deprecated Use saveQuoteDraft — partial saves orphan related quote children. */
export async function saveLineItems(
  quoteId: string,
  items: LineItemInput[],
  roomIdByIndex: string[] = [],
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (!quote) return { success: false, error: "Quote not found" };

    await supabase.from("quote_line_items").delete().eq("quote_id", quoteId);

    if (items.length > 0) {
      const { error } = await supabase.from("quote_line_items").insert(
        items.map((item, index) => ({
          quote_id: quoteId,
          type: item.type as LineItemType,
          description: item.description,
          qty: item.qty || 1,
          unit_cost: item.unit_cost || 0,
          markup: item.markup || 0,
          source: (item.source ?? "manual") as QuoteLineItemSource,
          room_id: resolveRoomIdForChild(
            item.room_index,
            item.room_id,
            roomIdByIndex,
          ),
          is_optional: item.is_optional ?? false,
          sort_order: item.sort_order ?? index,
        })),
      );
      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save line items",
    };
  }
}

/** @deprecated Use saveQuoteDraft — partial saves orphan related quote children. */
export async function saveTiers(
  quoteId: string,
  tiers: TierInput[],
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (!quote) return { success: false, error: "Quote not found" };

    await supabase.from("quote_tiers").delete().eq("quote_id", quoteId);

    if (tiers.length > 0) {
      const { error } = await supabase.from("quote_tiers").insert(
        tiers.map((tier) => ({
          quote_id: quoteId,
          tier: tier.tier,
          price: tier.price || 0,
          margin: tier.margin || 0,
          features: tier.features || [],
          benefits: tier.benefits || [],
        })),
      );
      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save tiers",
    };
  }
}

function resolveRoomIdForChild(
  roomIndex: number | undefined,
  roomId: string | undefined | null,
  roomIdByIndex: string[],
): string | null {
  if (roomIndex !== undefined) {
    const mapped = roomIdByIndex[roomIndex];
    if (mapped) return mapped;
    return null;
  }
  if (roomId && roomIdByIndex.includes(roomId)) {
    return roomId;
  }
  return null;
}

function serializeRoomForRpc(room: RoomInput, index: number) {
  return {
    name: room.name,
    surface_type: room.surface_type || "drywall",
    condition: room.condition || "good",
    sq_ft: room.sq_ft || 0,
    color_codes: room.color_codes || "",
    coats: room.coats || 2,
    prep_work: room.prep_work || "",
    sort_order: room.sort_order ?? index,
    photo_url: room.photo_url ?? null,
    is_optional: room.is_optional ?? false,
    length_ft: room.length_ft ?? null,
    width_ft: room.width_ft ?? null,
    height_ft: room.height_ft ?? null,
  };
}

function serializeSurfaceForRpc(surface: SurfaceInput, index: number) {
  return {
    room_index: surface.room_index,
    surface_type: surface.surface_type ?? "wall",
    sq_ft: surface.sq_ft || 0,
    coats: surface.coats || 2,
    unit_rate: surface.unit_rate || 0,
    rate_type: surface.rate_type ?? "sqft",
    notes: surface.notes ?? null,
    is_optional: surface.is_optional ?? false,
    sort_order: surface.sort_order ?? index,
    company_paint_product_id: surface.company_paint_product_id ?? null,
    product_override: surface.product_override ?? false,
    gallons_estimated: surface.gallons_estimated ?? null,
    surface_key: surface.surface_key ?? null,
  };
}

function serializePaintDefaultForRpc(defaultRow: QuotePaintDefaultInput) {
  return {
    surface_type: defaultRow.surface_type,
    company_paint_product_id: defaultRow.company_paint_product_id ?? null,
    coats: defaultRow.coats || 2,
  };
}

/** Persist quote_paint_defaults — uses service role after ownership check (RLS blocks direct inserts). */
async function persistQuotePaintDefaults(
  quoteId: string,
  companyId: string,
  defaults: QuotePaintDefaultInput[],
): Promise<ActionResult> {
  if (!(await verifyQuoteOwnership(quoteId, companyId))) {
    return { success: false, error: "Quote not found" };
  }

  const supabase = createAdminClient();
  const normalized = normalizeQuotePaintDefaults(defaults);

  const { error: deleteError } = await supabase
    .from("quote_paint_defaults")
    .delete()
    .eq("quote_id", quoteId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const { error: insertError } = await supabase.from("quote_paint_defaults").insert(
    normalized.map((row) => ({
      quote_id: quoteId,
      surface_type: row.surface_type,
      company_paint_product_id: row.company_paint_product_id,
      coats: row.coats,
    })),
  );

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, data: undefined };
}

/** Persist quote_baseline_paint_systems — uses service role after ownership check. */
async function persistQuoteBaselinePaintSystems(
  quoteId: string,
  companyId: string,
  jobType: QuoteJobType,
  systems: BaselinePaintSystemInput[],
): Promise<ActionResult> {
  if (!(await verifyQuoteOwnership(quoteId, companyId))) {
    return { success: false, error: "Quote not found" };
  }

  const supabase = createAdminClient();
  const normalized = normalizeBaselinePaintSystems(systems, jobType);

  const { error: deleteError } = await supabase
    .from("quote_baseline_paint_systems")
    .delete()
    .eq("quote_id", quoteId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const { error: insertError } = await supabase
    .from("quote_baseline_paint_systems")
    .insert(
      normalized.map((row) => ({
        quote_id: quoteId,
        application_scope: row.application_scope,
        surface_category: row.surface_category,
        primer_product_id: row.primer_product_id,
        topcoat_product_id: row.topcoat_product_id,
        primer_coats: row.primer_coats,
        topcoat_coats: row.topcoat_coats,
        primer_spot_prime: row.primer_spot_prime ?? false,
      })),
    );

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, data: undefined };
}

async function persistTierDisplayNames(
  quoteId: string,
  companyId: string,
  tiers: TierInput[],
): Promise<ActionResult> {
  if (!(await verifyQuoteOwnership(quoteId, companyId))) {
    return { success: false, error: "Quote not found" };
  }

  const supabase = createAdminClient();
  for (const tier of tiers) {
    const { error } = await supabase
      .from("quote_tiers")
      .update({ display_name: tier.display_name?.trim() || null })
      .eq("quote_id", quoteId)
      .eq("tier", tier.tier);
    if (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: true, data: undefined };
}

function serializeLineItemForRpc(item: LineItemInput, index: number) {
  return {
    room_index: item.room_index,
    type: item.type,
    description: item.description,
    qty: item.qty || 1,
    unit_cost: item.unit_cost || 0,
    markup: item.markup || 0,
    source: item.source ?? "manual",
    is_optional: item.is_optional ?? false,
    sort_order: item.sort_order ?? index,
    company_paint_product_id: item.company_paint_product_id ?? null,
    paint_role: item.paint_role ?? null,
  };
}

function serializeTierPaintConfigForRpc(config: TierPaintConfigInput) {
  return {
    tier: config.tier,
    primer_product_id: config.primer_product_id,
    topcoat_product_id: config.topcoat_product_id,
    primer_coats: config.primer_coats,
    topcoat_coats: config.topcoat_coats,
    primer_spot_prime: config.primer_spot_prime ?? false,
    labor_hours_delta_pct: config.labor_hours_delta_pct,
    labor_hours_delta_hours: config.labor_hours_delta_hours,
    prep_hours_delta: config.prep_hours_delta,
    value_add_features: config.value_add_features,
    snapshot: {},
  };
}

function serializeTierForRpc(tier: TierInput) {
  return {
    tier: tier.tier,
    price: tier.price || 0,
    margin: tier.margin || 0,
    features: tier.features || [],
    benefits: tier.benefits || [],
    display_name: tier.display_name ?? null,
  };
}

function lineItemSellingTotal(item: {
  qty: number;
  unit_cost: number;
  markup: number;
}): number {
  return item.qty * item.unit_cost * (1 + (item.markup ?? 0) / 100);
}

async function verifyQuoteOwnership(quoteId: string, companyId: string) {
  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id")
    .eq("id", quoteId)
    .eq("company_id", companyId)
    .single();
  return quote;
}

/** @deprecated Use saveQuoteDraft — partial saves orphan related quote children. */
export async function saveSurfaces(
  quoteId: string,
  surfaces: SurfaceInput[],
  roomIdByIndex: string[],
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    if (!(await verifyQuoteOwnership(quoteId, companyId))) {
      return { success: false, error: "Quote not found" };
    }

    await supabase.from("quote_surfaces").delete().eq("quote_id", quoteId);

    const rows = surfaces
      .map((surface, index) => {
        const roomId = resolveRoomIdForChild(
          surface.room_index,
          surface.room_id,
          roomIdByIndex,
        );
        if (!roomId) return null;
        return {
          quote_id: quoteId,
          room_id: roomId,
          surface_type: (surface.surface_type ?? "wall") as QuoteSurfaceKind,
          sq_ft: surface.sq_ft || 0,
          coats: surface.coats || 2,
          unit_rate: surface.unit_rate || 0,
          rate_type: (surface.rate_type ?? "sqft") as QuoteRateType,
          notes: surface.notes ?? null,
          is_optional: surface.is_optional ?? false,
          sort_order: surface.sort_order ?? index,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length > 0) {
      const { error } = await supabase.from("quote_surfaces").insert(rows);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save surfaces",
    };
  }
}

async function loadDraftChildrenForRpc(
  quoteId: string,
  draft: QuoteDraftInput,
): Promise<
  ActionResult<{
    rooms: RoomInput[];
    surfaces: SurfaceInput[];
    lineItems: LineItemInput[];
    tiers: TierInput[];
    tierPaintConfig: TierPaintConfigInput[];
    paintDefaults: QuotePaintDefaultInput[];
  }>
> {
  const supabase = await createClient();
  const needsRooms = draft.rooms === undefined;
  const needsSurfaces = draft.surfaces === undefined;
  const needsLineItems = draft.lineItems === undefined;
  const needsTiers = draft.tiers === undefined;
  const needsTierPaintConfig = draft.tierPaintConfig === undefined;
  const needsPaintDefaults = draft.paintDefaults === undefined;

  const [roomsRes, surfacesRes, lineItemsRes, tiersRes, paintConfigRes, paintDefaultsRes] =
    await Promise.all([
    needsRooms
      ? supabase
          .from("quote_rooms")
          .select("*")
          .eq("quote_id", quoteId)
          .order("sort_order")
      : Promise.resolve({ data: null, error: null }),
    needsSurfaces
      ? supabase.from("quote_surfaces").select("*").eq("quote_id", quoteId)
      : Promise.resolve({ data: null, error: null }),
    needsLineItems
      ? supabase
          .from("quote_line_items")
          .select("*")
          .eq("quote_id", quoteId)
          .order("sort_order")
      : Promise.resolve({ data: null, error: null }),
    needsTiers
      ? supabase.from("quote_tiers").select("*").eq("quote_id", quoteId)
      : Promise.resolve({ data: null, error: null }),
    needsTierPaintConfig
      ? supabase
          .from("quote_tier_paint_config")
          .select("*")
          .eq("quote_id", quoteId)
      : Promise.resolve({ data: null, error: null }),
    needsPaintDefaults
      ? supabase
          .from("quote_paint_defaults")
          .select("*")
          .eq("quote_id", quoteId)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (roomsRes.error) return { success: false, error: roomsRes.error.message };
  if (surfacesRes.error) {
    return { success: false, error: surfacesRes.error.message };
  }
  if (lineItemsRes.error) {
    return { success: false, error: lineItemsRes.error.message };
  }
  if (tiersRes.error) return { success: false, error: tiersRes.error.message };
  if (paintConfigRes.error) {
    return { success: false, error: paintConfigRes.error.message };
  }
  if (paintDefaultsRes.error) {
    return { success: false, error: paintDefaultsRes.error.message };
  }

  const dbRooms = (roomsRes.data ?? []) as QuoteRoom[];

  const rooms =
    draft.rooms ??
    dbRooms.map((room, index) => ({
      id: room.id,
      name: room.name,
      surface_type: room.surface_type,
      condition: room.condition,
      sq_ft: room.sq_ft,
      color_codes: room.color_codes,
      coats: room.coats,
      prep_work: room.prep_work,
      sort_order: room.sort_order ?? index,
      photo_url: room.photo_url,
      is_optional: room.is_optional ?? false,
      length_ft: room.length_ft,
      width_ft: room.width_ft,
      height_ft: room.height_ft,
    }));

  const roomIdToIndex = new Map<string, number>();
  rooms.forEach((room, index) => {
    if (room.id) roomIdToIndex.set(room.id, index);
  });

  const surfaces =
    draft.surfaces ??
    ((surfacesRes.data ?? []) as QuoteSurface[]).map((surface, index) => ({
      id: surface.id,
      room_id: surface.room_id,
      room_index: roomIdToIndex.get(surface.room_id),
      surface_type: surface.surface_type,
      sq_ft: surface.sq_ft,
      coats: surface.coats,
      unit_rate: surface.unit_rate,
      rate_type: surface.rate_type,
      notes: surface.notes,
      is_optional: surface.is_optional ?? false,
      sort_order: surface.sort_order ?? index,
      company_paint_product_id: surface.company_paint_product_id ?? null,
      product_override: surface.product_override ?? false,
      gallons_estimated: surface.gallons_estimated ?? null,
      surface_key: surface.surface_key ?? null,
    }));

  const lineItems =
    draft.lineItems ??
    ((lineItemsRes.data ?? []) as QuoteLineItem[]).map((item, index) => ({
      id: item.id,
      type: item.type,
      description: item.description,
      qty: item.qty,
      unit_cost: item.unit_cost,
      markup: item.markup,
      source: item.source ?? "manual",
      room_id: item.room_id,
      room_index:
        item.room_id != null ? roomIdToIndex.get(item.room_id) : undefined,
      is_optional: item.is_optional ?? false,
      sort_order: item.sort_order ?? index,
      company_paint_product_id: item.company_paint_product_id ?? null,
      paint_role: item.paint_role ?? null,
    }));

  const tiers =
    draft.tiers ??
    ((tiersRes.data ?? []) as QuoteTier[]).map((tier) => ({
      id: tier.id,
      tier: tier.tier,
      price: tier.price,
      margin: tier.margin,
      features: tier.features ?? [],
      benefits: tier.benefits ?? [],
      display_name: tier.display_name ?? null,
    }));

  const tierPaintConfig =
    draft.tierPaintConfig ??
    ((paintConfigRes.data ?? []) as QuoteTierPaintConfig[]).map((row) => ({
      tier: row.tier as TierPaintConfigInput["tier"],
      primer_product_id: row.primer_product_id,
      topcoat_product_id: row.topcoat_product_id,
      primer_coats: row.primer_coats,
      topcoat_coats: row.topcoat_coats,
      primer_spot_prime: row.primer_spot_prime ?? false,
      labor_hours_delta_pct: row.labor_hours_delta_pct,
      labor_hours_delta_hours: row.labor_hours_delta_hours,
      prep_hours_delta: row.prep_hours_delta,
      value_add_features: row.value_add_features ?? [],
    }));

  const paintDefaults = normalizeQuotePaintDefaults(
    draft.paintDefaults ??
      ((paintDefaultsRes.data ?? []) as {
        surface_type: QuoteSurfaceKind;
        company_paint_product_id: string | null;
        coats: number;
      }[]).map((row) => ({
        surface_type: row.surface_type,
        company_paint_product_id: row.company_paint_product_id,
        coats: row.coats ?? 2,
      })),
  );

  return {
    success: true,
    data: { rooms, surfaces, lineItems, tiers, tierPaintConfig, paintDefaults },
  };
}

export async function saveQuoteDraft(
  quoteId: string,
  draft: QuoteDraftInput,
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    if (!(await verifyQuoteOwnership(quoteId, companyId))) {
      return { success: false, error: "Quote not found" };
    }

    if (draft.header) {
      const headerResult = await updateQuote(quoteId, draft.header);
      if (!headerResult.success) return headerResult;
    }

    const hasChildUpdates =
      draft.rooms !== undefined ||
      draft.surfaces !== undefined ||
      draft.lineItems !== undefined ||
      draft.tiers !== undefined ||
      draft.tierPaintConfig !== undefined ||
      draft.paintDefaults !== undefined ||
      draft.baselinePaintSystems !== undefined;

    if (!hasChildUpdates) {
      revalidatePath("/app/quotes");
      revalidatePath(`/app/quotes/${quoteId}`);
      return { success: true, data: undefined };
    }

    const childrenResult = await loadDraftChildrenForRpc(quoteId, draft);
    if (!childrenResult.success) return childrenResult;

    const { rooms, surfaces, lineItems, tiers, tierPaintConfig, paintDefaults } =
      childrenResult.data;

    const { error: rpcError } = await supabase.rpc("save_quote_draft_children", {
      p_quote_id: quoteId,
      p_rooms: rooms.map(serializeRoomForRpc),
      p_surfaces: surfaces.map(serializeSurfaceForRpc),
      p_line_items: lineItems.map(serializeLineItemForRpc),
      p_tiers: tiers.map(serializeTierForRpc),
      p_tier_paint_config: tierPaintConfig.map(serializeTierPaintConfigForRpc),
      p_paint_defaults: normalizeQuotePaintDefaults(paintDefaults).map(
        serializePaintDefaultForRpc,
      ),
    });

    if (rpcError) return { success: false, error: rpcError.message };

    if (draft.paintDefaults !== undefined) {
      const paintResult = await persistQuotePaintDefaults(
        quoteId,
        companyId,
        paintDefaults,
      );
      if (!paintResult.success) return paintResult;
    }

    if (draft.baselinePaintSystems !== undefined) {
      const jobType =
        draft.header?.job_type ??
        (
          await supabase
            .from("quotes")
            .select("job_type")
            .eq("id", quoteId)
            .single()
        ).data?.job_type ??
        "interior";
      const baselineResult = await persistQuoteBaselinePaintSystems(
        quoteId,
        companyId,
        jobType as QuoteJobType,
        draft.baselinePaintSystems,
      );
      if (!baselineResult.success) return baselineResult;
    }

    if (draft.tiers !== undefined) {
      const tierNameResult = await persistTierDisplayNames(
        quoteId,
        companyId,
        tiers,
      );
      if (!tierNameResult.success) return tierNameResult;
    }

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save quote draft",
    };
  }
}

export async function sendQuote(quoteId: string): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*, customers(name, email, portal_token)")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (error || !quote) return { success: false, error: "Quote not found" };

    if (quote.status === "accepted") {
      return { success: false, error: "Accepted quotes cannot be resent." };
    }

    if (quote.status === "declined") {
      return {
        success: false,
        error: "Revise this quote to draft before sending again.",
      };
    }

    if (quote.status !== "draft" && quote.status !== "sent") {
      return { success: false, error: "This quote cannot be sent." };
    }

    const { data: tiers } = await supabase
      .from("quote_tiers")
      .select("price")
      .eq("quote_id", quoteId);

    if (!tiers?.some((tier) => tier.price > 0)) {
      return {
        success: false,
        error: "Set at least one tier price before sending.",
      };
    }

    const customer = quote.customers as {
      name: string;
      email: string | null;
      portal_token: string;
    } | null;

    if (!customer?.email?.trim()) {
      return {
        success: false,
        error: "Add an email address to the customer before sending.",
      };
    }

    const { data: company } = await supabase
      .from("companies")
      .select("slug, name")
      .eq("id", companyId)
      .single();

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${company?.slug}/quotes/${quoteId}?portal_token=${customer.portal_token}`;

    const template = quoteSentEmail({
      customerName: customer.name,
      companyName: company?.name ?? "Your painter",
      portalUrl,
    });
    const emailResult = await sendEmail({
      to: customer.email,
      toName: customer.name,
      ...template,
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error };
    }

    await createNotification({
      companyId,
      type: "quote_sent",
      title: `Quote sent to ${customer?.name ?? "customer"}`,
      body: formatJobAddress(quote),
      href: `/app/quotes/${quoteId}`,
    });

    const { error: statusError } = await supabase
      .from("quotes")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .in("status", ["draft", "sent"]);

    if (statusError) return { success: false, error: statusError.message };

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send quote",
    };
  }
}

export async function fetchQuoteWorkspace(quoteId: string): Promise<
  ActionResult<{
    quote: Quote;
    rooms: QuoteRoom[];
    surfaces: QuoteSurface[];
    lineItems: QuoteLineItem[];
    tiers: QuoteTier[];
    tierPaintConfig: TierPaintConfigInput[];
    jobId: string | null;
  }>
> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const [
      { data: quote, error: quoteError },
      { data: rooms },
      { data: surfaces },
      { data: lineItems },
      { data: tiers },
      { data: tierPaintConfig },
      { data: job },
    ] = await Promise.all([
      supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .eq("company_id", companyId)
        .single(),
      supabase
        .from("quote_rooms")
        .select("*")
        .eq("quote_id", quoteId)
        .order("sort_order"),
      supabase.from("quote_surfaces").select("*").eq("quote_id", quoteId),
      supabase
        .from("quote_line_items")
        .select("*")
        .eq("quote_id", quoteId)
        .order("sort_order"),
      supabase.from("quote_tiers").select("*").eq("quote_id", quoteId),
      supabase
        .from("quote_tier_paint_config")
        .select("*")
        .eq("quote_id", quoteId),
      supabase.from("jobs").select("id").eq("quote_id", quoteId).maybeSingle(),
    ]);

    if (quoteError || !quote) {
      return { success: false, error: "Quote not found" };
    }

    return {
      success: true,
      data: {
        quote: quote as Quote,
        rooms: (rooms ?? []) as QuoteRoom[],
        surfaces: (surfaces ?? []) as QuoteSurface[],
        lineItems: (lineItems ?? []) as QuoteLineItem[],
        tiers: (tiers ?? []) as QuoteTier[],
        tierPaintConfig: ((tierPaintConfig ?? []) as QuoteTierPaintConfig[]).map(
          (row) => ({
            tier: row.tier as TierPaintConfigInput["tier"],
            primer_product_id: row.primer_product_id,
            topcoat_product_id: row.topcoat_product_id,
            primer_coats: row.primer_coats,
            topcoat_coats: row.topcoat_coats,
            primer_spot_prime: row.primer_spot_prime ?? false,
            labor_hours_delta_pct: row.labor_hours_delta_pct,
            labor_hours_delta_hours: row.labor_hours_delta_hours,
            prep_hours_delta: row.prep_hours_delta,
            value_add_features: row.value_add_features ?? [],
          }),
        ),
        jobId: job?.id ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load quote",
    };
  }
}

export async function fetchQuoteChildren(quoteId: string): Promise<
  ActionResult<{
    rooms: QuoteRoom[];
    surfaces: QuoteSurface[];
    lineItems: QuoteLineItem[];
  }>
> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (!quote) return { success: false, error: "Quote not found" };

    const [{ data: rooms }, { data: surfaces }, { data: lineItems }] =
      await Promise.all([
        supabase
          .from("quote_rooms")
          .select("*")
          .eq("quote_id", quoteId)
          .order("sort_order"),
        supabase.from("quote_surfaces").select("*").eq("quote_id", quoteId),
        supabase
          .from("quote_line_items")
          .select("*")
          .eq("quote_id", quoteId)
          .order("sort_order"),
      ]);

    return {
      success: true,
      data: {
        rooms: (rooms ?? []) as QuoteRoom[],
        surfaces: (surfaces ?? []) as QuoteSurface[],
        lineItems: (lineItems ?? []) as QuoteLineItem[],
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load quote data",
    };
  }
}

export async function reviseQuoteToDraft(
  quoteId: string,
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("status")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (fetchError || !quote) {
      return { success: false, error: "Quote not found" };
    }

    if (quote.status !== "sent" && quote.status !== "declined") {
      return {
        success: false,
        error: "Only sent or declined quotes can be revised to draft.",
      };
    }

    const { error } = await supabase
      .from("quotes")
      .update({
        status: "draft",
        accepted_tier: null,
        accepted_optional_line_item_ids: [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .eq("company_id", companyId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to revise quote",
    };
  }
}

export async function resendQuote(quoteId: string): Promise<ActionResult> {
  return sendQuote(quoteId);
}

export async function acceptQuote(
  quoteId: string,
  tier: QuoteTierName,
  portalToken: string,
  selectedOptionalLineItemIds: string[] = [],
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*, customers(portal_token, id, name)")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: "Quote not found" };
    }

    if (quote.status !== "sent") {
      return {
        success: false,
        error:
          quote.status === "accepted"
            ? "This quote has already been accepted."
            : "This quote is not available for acceptance.",
      };
    }

    const customer = quote.customers as {
      portal_token: string;
      id: string;
      name: string;
    } | null;

    if (!customer || customer.portal_token !== portalToken) {
      return { success: false, error: "Invalid portal access" };
    }

    const { data: tierData, error: tierError } = await supabase
      .from("quote_tiers")
      .select("price")
      .eq("quote_id", quoteId)
      .eq("tier", tier)
      .single();

    if (tierError || !tierData || tierData.price <= 0) {
      return { success: false, error: "Selected package is not available." };
    }

    const { data: optionalItems } = await supabase
      .from("quote_line_items")
      .select("id, qty, unit_cost, markup")
      .eq("quote_id", quoteId)
      .eq("is_optional", true);

    const validOptionalIds = new Set(
      (optionalItems ?? []).map((item) => item.id),
    );
    const acceptedOptionalIds = selectedOptionalLineItemIds.filter((id) =>
      validOptionalIds.has(id),
    );
    const optionsTotal = (optionalItems ?? [])
      .filter((item) => acceptedOptionalIds.includes(item.id))
      .reduce((sum, item) => sum + lineItemSellingTotal(item), 0);

    const sellingPrice = tierData.price + optionsTotal;

    const { data: acceptedQuote, error: updateError } = await supabase
      .from("quotes")
      .update({
        status: "accepted",
        accepted_tier: tier,
        accepted_optional_line_item_ids: acceptedOptionalIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .eq("status", "sent")
      .select("id")
      .maybeSingle();

    if (updateError) return { success: false, error: updateError.message };
    if (!acceptedQuote) {
      return {
        success: false,
        error:
          "This quote is no longer available for acceptance. It may have already been accepted.",
      };
    }

    const defaultChecklist = [
      { id: "prep", label: "Site prep & protection", done: false },
      { id: "surfaces", label: "Surface prep complete", done: false },
      { id: "prime", label: "Primer applied (if needed)", done: false },
      { id: "coat1", label: "First coat complete", done: false },
      { id: "coat2", label: "Second coat complete", done: false },
      { id: "touchup", label: "Touch-ups & cleanup", done: false },
      {
        id: "walkthrough",
        label: "Final walkthrough with customer",
        done: false,
      },
    ];

    const { error: jobError } = await supabase.from("jobs").upsert(
      {
        company_id: quote.company_id,
        quote_id: quoteId,
        customer_id: customer.id,
        tier,
        status: "active",
        selling_price: sellingPrice,
        checklist: defaultChecklist,
      },
      { onConflict: "quote_id" },
    );

    if (jobError) return { success: false, error: jobError.message };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const quoteUrl = `${appUrl}/app/quotes/${quoteId}`;

    await createNotification({
      companyId: quote.company_id,
      type: "quote_accepted",
      title: `${customer.name} accepted a quote`,
      body: `${formatQuoteTierLabel(tier)} · ${formatJobAddress(quote)}`,
      href: `/app/quotes/${quoteId}`,
    });

    const { data: company } = await supabase
      .from("companies")
      .select("name, email")
      .eq("id", quote.company_id)
      .single();

    if (company?.email) {
      const template = quoteAcceptedEmail({
        customerName: customer.name,
        companyName: company.name,
        jobAddress: formatJobAddress(quote),
        tierLabel: formatQuoteTierLabel(tier),
        price: formatCurrency(sellingPrice),
        quoteUrl,
      });
      await sendEmail({
        to: company.email,
        toName: company.name,
        ...template,
      });
    }

    revalidatePath("/app/quotes");
    revalidatePath("/app/jobs");
    revalidatePath("/app/dashboard");

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to accept quote",
    };
  }
}

export async function declineQuote(
  quoteId: string,
  portalToken: string,
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*, customers(portal_token, name)")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: "Quote not found" };
    }

    const customer = quote.customers as {
      portal_token: string;
      name: string;
    } | null;

    if (!customer || customer.portal_token !== portalToken) {
      return { success: false, error: "Invalid portal access" };
    }

    if (quote.status === "accepted") {
      return { success: false, error: "This quote has already been accepted." };
    }

    if (quote.status !== "sent") {
      return {
        success: false,
        error: "Only sent quotes can be declined.",
      };
    }

    const { data: declinedQuote, error: updateError } = await supabase
      .from("quotes")
      .update({
        status: "declined",
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .eq("status", "sent")
      .select("id")
      .maybeSingle();

    if (updateError) return { success: false, error: updateError.message };
    if (!declinedQuote) {
      return { success: false, error: "This quote is not available to decline." };
    }

    const { data: company } = await supabase
      .from("companies")
      .select("name, email")
      .eq("id", quote.company_id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const quoteUrl = `${appUrl}/app/quotes/${quoteId}`;

    await createNotification({
      companyId: quote.company_id,
      type: "quote_declined",
      title: `${customer.name} declined a quote`,
      body: formatJobAddress(quote),
      href: `/app/quotes/${quoteId}`,
    });

    if (company?.email) {
      const template = quoteDeclinedEmail({
        customerName: customer.name,
        jobAddress: formatJobAddress(quote),
        quoteUrl,
      });
      await sendEmail({
        to: company.email,
        toName: company.name,
        ...template,
      });
    }

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quoteId}`);
    revalidatePath("/app/dashboard");

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to decline quote",
    };
  }
}

export async function duplicateQuote(
  quoteId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: source, error: sourceError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (sourceError || !source) {
      return { success: false, error: "Quote not found" };
    }

    const [
      { data: rooms },
      { data: surfaces },
      { data: lineItems },
      { data: tiers },
      { data: tierPaintConfig },
    ] = await Promise.all([
      supabase.from("quote_rooms").select("*").eq("quote_id", quoteId),
      supabase.from("quote_surfaces").select("*").eq("quote_id", quoteId),
      supabase.from("quote_line_items").select("*").eq("quote_id", quoteId),
      supabase.from("quote_tiers").select("*").eq("quote_id", quoteId),
      supabase.from("quote_tier_paint_config").select("*").eq("quote_id", quoteId),
    ]);

    const { data: newQuote, error: insertError } = await supabase
      .from("quotes")
      .insert({
        company_id: companyId,
        customer_id: source.customer_id,
        job_address: source.job_address,
        job_address_line2: source.job_address_line2,
        job_city: source.job_city,
        job_state: source.job_state,
        job_zip: source.job_zip,
        before_photos: source.before_photos ?? [],
        name: source.name,
        job_type: source.job_type ?? "interior",
        estimation_mode: source.estimation_mode ?? "hybrid",
        custom_message: source.custom_message,
        status: "draft",
      })
      .select("id")
      .single();

    if (insertError || !newQuote) {
      return { success: false, error: insertError?.message ?? "Duplicate failed" };
    }

    const newQuoteId = newQuote.id;

    const roomIdMap = new Map<string, string>();

    if (rooms?.length) {
      const { data: insertedRooms, error: roomError } = await supabase
        .from("quote_rooms")
        .insert(
          rooms.map(
            ({
              name,
              surface_type,
              condition,
              sq_ft,
              color_codes,
              coats,
              prep_work,
              sort_order,
              photo_url,
              is_optional,
              length_ft,
              width_ft,
              height_ft,
            }) => ({
              quote_id: newQuoteId,
              name,
              surface_type,
              condition,
              sq_ft,
              color_codes,
              coats,
              prep_work,
              sort_order: sort_order ?? 0,
              photo_url,
              is_optional: is_optional ?? false,
              length_ft,
              width_ft,
              height_ft,
            }),
          ),
        )
        .select("id");

      if (roomError) return { success: false, error: roomError.message };

      rooms.forEach((room, index) => {
        const newId = insertedRooms?.[index]?.id;
        if (newId) roomIdMap.set(room.id, newId);
      });
    }

    if (surfaces?.length) {
      const surfaceRows = surfaces
        .map((surface) => {
          const roomId = roomIdMap.get(surface.room_id);
          if (!roomId) return null;
          return {
            quote_id: newQuoteId,
            room_id: roomId,
            surface_type: surface.surface_type,
            sq_ft: surface.sq_ft,
            coats: surface.coats,
            unit_rate: surface.unit_rate,
            rate_type: surface.rate_type,
            notes: surface.notes,
            is_optional: surface.is_optional ?? false,
            sort_order: surface.sort_order ?? 0,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (surfaceRows.length) {
        const { error: surfaceError } = await supabase
          .from("quote_surfaces")
          .insert(surfaceRows);
        if (surfaceError) {
          return { success: false, error: surfaceError.message };
        }
      }
    }

    if (lineItems?.length) {
      const { error: lineItemError } = await supabase
        .from("quote_line_items")
        .insert(
          lineItems.map(
            ({
              type,
              description,
              qty,
              unit_cost,
              markup,
              source,
              room_id,
              is_optional,
              sort_order,
              company_paint_product_id,
              paint_role,
            }) => ({
              quote_id: newQuoteId,
              type,
              description,
              qty,
              unit_cost,
              markup,
              source: source ?? "manual",
              room_id: room_id ? (roomIdMap.get(room_id) ?? null) : null,
              is_optional: is_optional ?? false,
              sort_order: sort_order ?? 0,
              company_paint_product_id: company_paint_product_id ?? null,
              paint_role: paint_role ?? null,
            }),
          ),
        );
      if (lineItemError) {
        return { success: false, error: lineItemError.message };
      }
    }

    if (tiers?.length) {
      const { error: tierError } = await supabase.from("quote_tiers").insert(
        tiers.map(({ tier, price, margin, features, benefits }) => ({
          quote_id: newQuoteId,
          tier,
          price,
          margin,
          features,
          benefits,
        })),
      );
      if (tierError) return { success: false, error: tierError.message };
    }

    if (tierPaintConfig?.length) {
      const { error: paintError } = await supabase
        .from("quote_tier_paint_config")
        .insert(
          tierPaintConfig.map(
            ({
              tier,
              primer_product_id,
              topcoat_product_id,
              primer_coats,
              topcoat_coats,
              primer_spot_prime,
              labor_hours_delta_pct,
              labor_hours_delta_hours,
              prep_hours_delta,
              value_add_features,
            }) => ({
              quote_id: newQuoteId,
              tier,
              primer_product_id,
              topcoat_product_id,
              primer_coats,
              topcoat_coats,
              primer_spot_prime: primer_spot_prime ?? false,
              labor_hours_delta_pct,
              labor_hours_delta_hours,
              prep_hours_delta,
              value_add_features,
            }),
          ),
        );
      if (paintError) return { success: false, error: paintError.message };
    }

    revalidatePath("/app/quotes");
    return { success: true, data: { id: newQuoteId } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to duplicate quote",
    };
  }
}

export async function listQuoteTemplates(): Promise<ActionResult<QuoteTemplate[]>> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quote_templates")
      .select("*")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as QuoteTemplate[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load templates",
    };
  }
}

export async function saveQuoteTemplate(input: {
  name: string;
  description?: string | null;
  job_type: QuoteJobType;
  payload: Record<string, unknown>;
  source_quote_id?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();
    const name = input.name.trim();

    if (!name) {
      return { success: false, error: "Template name is required." };
    }

    const { data, error } = await supabase
      .from("quote_templates")
      .insert({
        company_id: companyId,
        name,
        description: input.description?.trim() || null,
        job_type: input.job_type,
        source_quote_id: input.source_quote_id ?? null,
        payload: input.payload,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/quotes/new");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save template",
    };
  }
}

export async function updateQuoteTemplate(
  templateId: string,
  input: {
    name: string;
    description?: string | null;
  },
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();
    const name = input.name.trim();

    if (!name) {
      return { success: false, error: "Template name is required." };
    }

    const { error } = await supabase
      .from("quote_templates")
      .update({
        name,
        description: input.description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId)
      .eq("company_id", companyId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/quotes/new");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update template",
    };
  }
}

export async function deleteQuote(quoteId: string): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id, status")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (quoteError) return { success: false, error: quoteError.message };
    if (!quote) return { success: false, error: "Estimate not found." };

    const { data: linkedJob, error: jobError } = await supabase
      .from("jobs")
      .select("id")
      .eq("quote_id", quoteId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (jobError) return { success: false, error: jobError.message };
    if (linkedJob) {
      return {
        success: false,
        error:
          "This estimate is linked to a job. Remove the job before deleting the estimate.",
      };
    }

    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", quoteId)
      .eq("company_id", companyId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/quotes");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/jobs");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete estimate",
    };
  }
}

export async function deleteQuoteTemplate(
  templateId: string,
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("quote_templates")
      .delete()
      .eq("id", templateId)
      .eq("company_id", companyId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/quotes/new");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete template",
    };
  }
}
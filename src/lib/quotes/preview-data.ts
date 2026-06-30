import type { TierInput } from "@/app/app/(portal)/quotes/actions";
import type { LineItemInput } from "@/app/app/(portal)/quotes/actions";
import type { RoomInput } from "@/app/app/(portal)/quotes/actions";
import {
  buildTierPaintSummaries,
} from "@/lib/paint-library/tier-display";
import {
  QUOTE_PAINT_TIERS,
  type CompanyPaintProductRow,
  type TierPaintConfigInput,
} from "@/lib/paint-library/types";
import type {
  Quote,
  QuoteLineItem,
  QuoteRoom,
  QuoteTier,
  QuoteTierName,
} from "@/types/database";
import type { JobAddressFields } from "@/lib/address";

export type QuotePreviewInput = {
  quoteId: string;
  companyId: string;
  customerId: string;
  quoteName: string | null;
  jobType: Quote["job_type"];
  customMessage: string | null;
  jobAddress: JobAddressFields;
  beforePhotos: string[];
  status: Quote["status"];
  tierState: Record<QuoteTierName, TierInput>;
  lineItems: LineItemInput[];
  rooms?: RoomInput[];
  estimationMode?: Quote["estimation_mode"];
  tierPaintConfig?: TierPaintConfigInput[];
  paintProducts?: CompanyPaintProductRow[];
};

export function buildPreviewQuote(input: QuotePreviewInput): Quote {
  const now = new Date().toISOString();
  return {
    id: input.quoteId || "preview",
    company_id: input.companyId,
    customer_id: input.customerId,
    name: input.quoteName,
    job_type: input.jobType,
    estimation_mode: input.estimationMode ?? "hybrid",
    custom_message: input.customMessage,
    job_address: input.jobAddress.job_address,
    job_address_line2: input.jobAddress.job_address_line2 ?? null,
    job_city: input.jobAddress.job_city ?? null,
    job_state: input.jobAddress.job_state ?? null,
    job_zip: input.jobAddress.job_zip ?? null,
    status: input.status,
    before_photos: input.beforePhotos,
    accepted_tier: null,
    accepted_optional_line_item_ids: [],
    created_at: now,
    updated_at: now,
  };
}

export function buildPreviewTiers(
  quoteId: string,
  tierState: Record<QuoteTierName, TierInput>,
): QuoteTier[] {
  return QUOTE_PAINT_TIERS.map((tier) => ({
      id: `preview-${tier}`,
      quote_id: quoteId || "preview",
      tier,
      price: tierState[tier].price,
      margin: tierState[tier].margin,
      features: tierState[tier].features,
      benefits: tierState[tier].benefits,
    }))
    .filter((tier) => tier.price > 0);
}

export function buildPreviewRooms(
  quoteId: string,
  rooms: RoomInput[] = [],
): QuoteRoom[] {
  return rooms.map((room, index) => ({
    id: room.id ?? `preview-room-${index}`,
    quote_id: quoteId || "preview",
    name: room.name,
    surface_type: room.surface_type ?? "drywall",
    condition: room.condition ?? "good",
    sq_ft: room.sq_ft ?? 0,
    color_codes: room.color_codes ?? "",
    coats: room.coats ?? 2,
    prep_work: room.prep_work ?? "",
    sort_order: room.sort_order ?? index,
    photo_url: room.photo_url ?? null,
    is_optional: room.is_optional ?? false,
    length_ft: room.length_ft ?? null,
    width_ft: room.width_ft ?? null,
    height_ft: room.height_ft ?? null,
  }));
}

export function buildPreviewOptionalItems(
  quoteId: string,
  lineItems: LineItemInput[],
): QuoteLineItem[] {
  return lineItems
    .filter((item) => item.is_optional)
    .map((item, index) => ({
      id: item.id ?? `preview-opt-${index}`,
      quote_id: quoteId || "preview",
      type: item.type,
      description: item.description,
      qty: item.qty,
      unit_cost: item.unit_cost,
      markup: item.markup,
      source: item.source ?? "manual",
      room_id: item.room_id ?? null,
      is_optional: true,
      sort_order: item.sort_order ?? index,
      company_paint_product_id: item.company_paint_product_id ?? null,
      paint_role: item.paint_role ?? null,
    }));
}
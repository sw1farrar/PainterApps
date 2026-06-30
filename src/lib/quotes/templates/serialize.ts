import type {
  LineItemInput,
  QuoteDraftInput,
  RoomInput,
  SurfaceInput,
  TierInput,
} from "@/app/app/(portal)/quotes/actions";
import type { TierPaintConfigInput } from "@/lib/paint-library/types";
import type { QuoteEstimationMode, QuoteTemplate } from "@/types/database";

export type QuoteTemplatePayload = {
  estimation_mode: QuoteEstimationMode;
  custom_message: string | null;
  rooms: RoomInput[];
  surfaces: SurfaceInput[];
  lineItems: LineItemInput[];
  tiers: TierInput[];
  tierPaintConfig?: TierPaintConfigInput[];
};

export function buildTemplatePayload(draft: QuoteDraftInput): QuoteTemplatePayload {
  return {
    estimation_mode: draft.header?.estimation_mode ?? "hybrid",
    custom_message: draft.header?.custom_message?.trim() || null,
    rooms: (draft.rooms ?? []).map((room, index) => ({
      ...room,
      id: undefined,
      sort_order: room.sort_order ?? index,
    })),
    surfaces: (draft.surfaces ?? []).map((surface) => ({
      ...surface,
      id: undefined,
      room_id: undefined,
    })),
    lineItems: (draft.lineItems ?? []).map((item, index) => ({
      ...item,
      id: undefined,
      room_id: null,
      sort_order: item.sort_order ?? index,
    })),
    tiers: draft.tiers ?? [],
    tierPaintConfig: draft.tierPaintConfig ?? [],
  };
}

export function stripTemplatePayload(
  payload: QuoteTemplatePayload,
): QuoteTemplatePayload {
  return {
    estimation_mode: payload.estimation_mode ?? "hybrid",
    custom_message: payload.custom_message ?? null,
    rooms: (payload.rooms ?? []).map((room, index) => ({
      ...room,
      id: undefined,
      sort_order: room.sort_order ?? index,
    })),
    surfaces: (payload.surfaces ?? []).map((surface) => ({
      ...surface,
      id: undefined,
      room_id: undefined,
    })),
    lineItems: (payload.lineItems ?? []).map((item, index) => ({
      ...item,
      id: undefined,
      room_id: null,
      sort_order: item.sort_order ?? index,
    })),
    tiers: payload.tiers ?? [],
    tierPaintConfig: payload.tierPaintConfig ?? [],
  };
}

export function templatePayloadToDraft(
  template: Pick<QuoteTemplate, "job_type" | "payload">,
): QuoteDraftInput {
  const payload = stripTemplatePayload(
    template.payload as QuoteTemplatePayload,
  );

  return {
    header: {
      job_type: template.job_type,
      estimation_mode: payload.estimation_mode,
      custom_message: payload.custom_message,
    },
    rooms: payload.rooms,
    surfaces: payload.surfaces,
    lineItems: payload.lineItems,
    tiers: payload.tiers,
    tierPaintConfig: payload.tierPaintConfig,
  };
}

export function templateAreaCount(template: Pick<QuoteTemplate, "payload">): number {
  const payload = template.payload as QuoteTemplatePayload;
  return payload.rooms?.length ?? 0;
}
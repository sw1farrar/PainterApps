import { buildLineItemsFromRooms } from "@/lib/quotes/estimate-from-rooms";
import type { RoomInput } from "@/app/app/(portal)/quotes/actions";
import type { Company } from "@/types/database";
import type { TaggedLineItem } from "./types";

import type { ResolvedTierPaintConfig } from "@/lib/paint-library/types";

export function buildLineItemsFromRoomAreas(
  rooms: RoomInput[],
  roomIndices: number[],
  company: Company,
  goodTierPaint?: ResolvedTierPaintConfig | null,
): TaggedLineItem[] {
  const pairs = roomIndices
    .map((index) => ({ index, room: rooms[index] }))
    .filter(
      (entry): entry is { index: number; room: RoomInput } =>
        Boolean(entry.room?.name?.trim() && entry.room.sq_ft > 0),
    );

  if (!pairs.length) return [];

  const items = buildLineItemsFromRooms(
    pairs.map((entry) => entry.room),
    company,
    goodTierPaint,
  );

  return items.map((item) => {
    const match = pairs.find((entry) =>
      item.description.startsWith(`${entry.room.name} —`),
    );
    return {
      ...item,
      source: "room" as const,
      room_index: match?.index,
      room_id: match?.room.id ?? null,
      is_optional: match?.room.is_optional ?? false,
      sort_order: match?.index ?? 0,
      company_paint_product_id: item.company_paint_product_id ?? null,
      paint_role: item.paint_role ?? null,
    };
  });
}
import { appendSundriesLineItems } from "@/lib/quotes/estimate-pricing-defaults";
import { buildLineItemsFromRoomAreas } from "./room";
import { buildLineItemsFromSurfaces } from "./surface";
import { tagManualLineItems } from "./manual";
import type { QuoteEstimateContext, TaggedLineItem } from "./types";

export type { EstimationSource, QuoteEstimateContext, TaggedLineItem } from "./types";

function surfacesByRoomIndex(surfaces: QuoteEstimateContext["surfaces"]) {
  const map = new Map<number, QuoteEstimateContext["surfaces"]>();
  for (const surface of surfaces) {
    if (surface.room_index === undefined) continue;
    const list = map.get(surface.room_index) ?? [];
    list.push(surface);
    map.set(surface.room_index, list);
  }
  return map;
}

function meaningfulSurfaces(
  surfaces: QuoteEstimateContext["surfaces"],
) {
  return surfaces.filter(
    (surface) => surface.sq_ft > 0 || surface.rate_type === "each",
  );
}

export function buildAllLineItems(ctx: QuoteEstimateContext): TaggedLineItem[] {
  const mode = ctx.estimationMode ?? "hybrid";
  const manual = tagManualLineItems(ctx.manualItems);

  if (mode === "manual") {
    return manual;
  }

  const surfacesForRoom = surfacesByRoomIndex(ctx.surfaces);
  const roomOnlyIndices: number[] = [];
  const surfaceItems: TaggedLineItem[] = [];

  ctx.rooms.forEach((room, index) => {
    const roomSurfaces = meaningfulSurfaces(surfacesForRoom.get(index) ?? []);

    if (mode === "surface" || mode === "hybrid") {
      if (roomSurfaces.length > 0) {
        surfaceItems.push(
          ...buildLineItemsFromSurfaces(
            roomSurfaces,
            ctx.company,
            ctx.rooms,
            ctx.goodTierPaint,
            ctx.jobType ?? "interior",
            ctx,
          ),
        );
        return;
      }
    }

    if (mode === "room" || mode === "hybrid") {
      if (room.name?.trim() && room.sq_ft > 0) {
        roomOnlyIndices.push(index);
      }
    }
  });

  const roomItems =
    mode === "surface"
      ? []
      : buildLineItemsFromRoomAreas(
          ctx.rooms,
          roomOnlyIndices,
          ctx.company,
          ctx.goodTierPaint,
        );

  return appendSundriesLineItems(
    [...manual, ...roomItems, ...surfaceItems],
    ctx.company,
  );
}

export function regenerateLineItems(
  ctx: QuoteEstimateContext,
  existingItems: TaggedLineItem[],
): TaggedLineItem[] {
  const manual = existingItems.filter(
    (item) => item.source === "manual" || !item.source,
  );
  return buildAllLineItems({ ...ctx, manualItems: manual });
}

export function buildLineItemsForArea(
  roomIndex: number,
  ctx: QuoteEstimateContext,
): TaggedLineItem[] {
  const mode = ctx.estimationMode ?? "hybrid";
  if (mode === "manual") return [];

  const roomSurfaces = meaningfulSurfaces(
    ctx.surfaces.filter((surface) => surface.room_index === roomIndex),
  );

  if (mode === "surface" || mode === "hybrid") {
    if (roomSurfaces.length > 0) {
      return appendSundriesLineItems(
        buildLineItemsFromSurfaces(
          roomSurfaces,
          ctx.company,
          ctx.rooms,
          ctx.goodTierPaint,
          ctx.jobType ?? "interior",
          ctx,
        ),
        ctx.company,
      );
    }
    if (mode === "surface") return [];
  }

  const room = ctx.rooms[roomIndex];
  if (room?.name?.trim() && room.sq_ft > 0) {
    return appendSundriesLineItems(
      buildLineItemsFromRoomAreas(
        ctx.rooms,
        [roomIndex],
        ctx.company,
        ctx.goodTierPaint,
      ),
      ctx.company,
    );
  }

  return [];
}
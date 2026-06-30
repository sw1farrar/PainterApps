import type { RoomInput } from "@/app/app/(portal)/quotes/actions";
import type { AreaSurfaceKey } from "@/lib/quotes/area-surface-catalog";

export type ClosetDimensions = {
  length_ft: number;
  width_ft: number;
  height_ft: number;
};

const CLOSET_META_PREFIX = "__closet__:";

export function encodeClosetNotes(
  dims: ClosetDimensions,
  detail?: string | null,
): string {
  const payload = JSON.stringify(dims);
  if (detail?.trim()) {
    return `${CLOSET_META_PREFIX}${payload}\n${detail.trim()}`;
  }
  return `${CLOSET_META_PREFIX}${payload}`;
}

export function parseClosetDimensions(
  notes: string | null | undefined,
): ClosetDimensions | null {
  if (!notes?.trim()) return null;
  const firstLine = notes.split("\n")[0]?.trim() ?? "";
  if (!firstLine.startsWith(CLOSET_META_PREFIX)) return null;
  try {
    const raw = JSON.parse(firstLine.slice(CLOSET_META_PREFIX.length)) as ClosetDimensions;
    if (
      raw.length_ft > 0 &&
      raw.width_ft > 0 &&
      raw.height_ft > 0
    ) {
      return raw;
    }
  } catch {
    return null;
  }
  return null;
}

export function closetInteriorWallSqFt(dims: ClosetDimensions): number {
  const { length_ft, width_ft, height_ft } = dims;
  if (length_ft <= 0 || width_ft <= 0 || height_ft <= 0) return 0;
  return Math.round(2 * (length_ft + width_ft) * height_ft);
}

export function closetCeilingSqFt(dims: ClosetDimensions): number {
  const { length_ft, width_ft } = dims;
  if (length_ft <= 0 || width_ft <= 0) return 0;
  return Math.round(length_ft * width_ft);
}

export function sqFtForAreaSurfaceKey(
  key: AreaSurfaceKey,
  room: Pick<RoomInput, "length_ft" | "width_ft" | "height_ft">,
  closet?: ClosetDimensions | null,
): number {
  const length = room.length_ft ?? 0;
  const width = room.width_ft ?? 0;
  const height = room.height_ft ?? 0;

  switch (key) {
    case "wall-1":
    case "wall-3":
      return length > 0 && height > 0 ? Math.round(length * height) : 0;
    case "wall-2":
    case "wall-4":
      return width > 0 && height > 0 ? Math.round(width * height) : 0;
    case "ceiling":
    case "floor":
      return length > 0 && width > 0 ? Math.round(length * width) : 0;
    case "door":
      return 1;
    case "window":
      return 0;
    case "trim":
      return length > 0 && width > 0
        ? Math.round(2 * (length + width))
        : 0;
    case "closet":
      return closet ? closetInteriorWallSqFt(closet) : 0;
    case "closet-ceiling":
      return closet ? closetCeilingSqFt(closet) : 0;
    default:
      return 0;
  }
}

export function totalWallSqFtFromRoom(
  room: Pick<RoomInput, "length_ft" | "width_ft" | "height_ft">,
): number {
  const keys: AreaSurfaceKey[] = ["wall-1", "wall-2", "wall-3", "wall-4"];
  return keys.reduce(
    (sum, key) => sum + sqFtForAreaSurfaceKey(key, room),
    0,
  );
}

export const AUTO_ENABLED_SURFACE_KEYS: AreaSurfaceKey[] = [
  "wall-1",
  "wall-2",
  "wall-3",
  "wall-4",
  "ceiling",
  "floor",
];

export const ROOM_SYNC_SURFACE_KEYS: AreaSurfaceKey[] = [
  "wall-1",
  "wall-2",
  "wall-3",
  "wall-4",
  "ceiling",
  "floor",
  "trim",
];

export const CLOSET_SYNC_SURFACE_KEYS: AreaSurfaceKey[] = [
  "closet",
  "closet-ceiling",
];
import type { LineItemInput } from "@/app/app/(portal)/quotes/actions";
import type { Company } from "@/types/database";
import type { QuoteSurfaceKind, QuoteRateType } from "@/types/database";

/** Strip trailing " 2", " 3", etc. to get the template base name. */
export function areaNameBase(name: string): string {
  const trimmed = name.trim();
  const match = trimmed.match(/^(.+?) (\d+)$/);
  return match ? match[1] : trimmed;
}

/** Next name when adding another of the same type: Bedroom → Bedroom 2 → Bedroom 3. */
export function nextSequencedAreaName(
  baseName: string,
  rooms: { name: string }[],
): string {
  const base = baseName.trim();
  if (!base) return base;

  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}(?: (\\d+))?$`, "i");

  let hasUnnumbered = false;
  let maxNumber = 0;

  for (const room of rooms) {
    const match = room.name.trim().match(pattern);
    if (!match) continue;
    if (!match[1]) {
      hasUnnumbered = true;
      maxNumber = Math.max(maxNumber, 1);
    } else {
      maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
    }
  }

  if (maxNumber === 0) return base;
  return `${base} ${maxNumber + 1}`;
}

export function countAreasMatchingBase(
  baseName: string,
  rooms: { name: string }[],
): number {
  const base = baseName.trim();
  if (!base) return 0;

  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}(?: (\\d+))?$`, "i");
  return rooms.filter((room) => pattern.test(room.name.trim())).length;
}

export const COMMON_AREAS = [
  "Living Room",
  "Kitchen",
  "Primary Bedroom",
  "Bedroom",
  "Bathroom",
  "Hallway",
  "Dining Room",
  "Office",
  "Garage",
  "Exterior",
] as const;

export const SURFACE_QUICK_ADD: {
  type: QuoteSurfaceKind;
  label: string;
  rate_type: QuoteRateType;
}[] = [
  { type: "wall", label: "Walls", rate_type: "sqft" },
  { type: "ceiling", label: "Ceiling", rate_type: "sqft" },
  { type: "trim", label: "Trim", rate_type: "linear" },
  { type: "window", label: "Windows", rate_type: "each" },
];

export function lineItemTotal(item: LineItemInput): number {
  return item.qty * item.unit_cost * (1 + (item.markup ?? 0) / 100);
}

export function wallSqFtFromDimensions(
  lengthFt: number,
  widthFt: number,
  heightFt: number,
): number {
  if (lengthFt <= 0 || widthFt <= 0 || heightFt <= 0) return 0;
  return Math.round(2 * (lengthFt + widthFt) * heightFt);
}

export { totalWallSqFtFromRoom as wallSqFtFromRoomPerimeter } from "@/lib/quotes/area-surface-dimensions";

export function ceilingSqFtFromDimensions(lengthFt: number, widthFt: number): number {
  if (lengthFt <= 0 || widthFt <= 0) return 0;
  return Math.round(lengthFt * widthFt);
}

export function getSurfaceRateOptions(company: Company) {
  const rates = company.labor_rates as Record<string, number>;
  const painter = rates.painter ?? 45;
  const prep = rates.prep ?? 40;
  return [
    { id: "painter-sqft", label: `Painter · ${painter}/hr equiv`, unit_rate: painter, rate_type: "sqft" as const },
    { id: "prep-sqft", label: `Prep · ${prep}/hr equiv`, unit_rate: prep, rate_type: "sqft" as const },
    { id: "trim-lf", label: "Trim · $1.50/lf", unit_rate: 1.5, rate_type: "linear" as const },
    { id: "each", label: "Per unit · $75", unit_rate: 75, rate_type: "each" as const },
  ];
}

export function remapRoomIndices<T extends { room_index?: number }>(
  items: T[],
  indexMap: Map<number, number>,
): T[] {
  return items.map((item) => {
    if (item.room_index === undefined) return item;
    const mapped = indexMap.get(item.room_index);
    if (mapped === undefined) return { ...item, room_index: undefined };
    return { ...item, room_index: mapped };
  });
}

export function buildIndexMapAfterReorder(
  length: number,
  fromIndex: number,
  toIndex: number,
): Map<number, number> {
  const order = Array.from({ length }, (_, i) => i);
  const [removed] = order.splice(fromIndex, 1);
  order.splice(toIndex, 0, removed);
  const map = new Map<number, number>();
  order.forEach((oldIndex, newIndex) => map.set(oldIndex, newIndex));
  return map;
}

export function buildIndexMapAfterDelete(
  length: number,
  deletedIndex: number,
): Map<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < length; i++) {
    if (i === deletedIndex) continue;
    map.set(i, i < deletedIndex ? i : i - 1);
  }
  return map;
}

export function buildIndexMapAfterBulkDelete(
  length: number,
  deletedIndices: number[],
): Map<number, number> {
  const deleted = new Set(deletedIndices);
  const map = new Map<number, number>();
  let nextIndex = 0;
  for (let i = 0; i < length; i++) {
    if (deleted.has(i)) continue;
    map.set(i, nextIndex);
    nextIndex += 1;
  }
  return map;
}
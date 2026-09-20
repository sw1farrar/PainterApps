export const ROOM_TEMPLATES = [
  { id: "bedroom", names: ["walls", "ceilings", "baseboards"] },
  { id: "bathroom", names: ["walls", "ceilings"] },
  { id: "kitchen", names: ["walls", "ceilings", "baseboards"] },
  { id: "living", names: ["walls", "ceilings", "baseboards"] },
  { id: "exterior", names: ["siding", "trim"] },
] as const;

export type RoomTemplateId = (typeof ROOM_TEMPLATES)[number]["id"];

export function rateIdsForTemplate(
  template: string,
  rates: Array<{ id: string; name: string }>,
) {
  const spec = ROOM_TEMPLATES.find((t) => t.id === template);
  if (!spec) return [];
  const ids: string[] = [];
  for (const needle of spec.names) {
    const hit = rates.find((r) => r.name.toLowerCase().includes(needle));
    if (hit) ids.push(hit.id);
  }
  return ids;
}

import { listSubstrateDefinitionsForRoom } from "@/lib/quotes/area-custom-substrates";
import {
  type AreaSubstrateDefinition,
  type AreaSubstrateId,
} from "@/lib/quotes/area-substrates";
import type { AreaSurfaceKey } from "@/lib/quotes/area-surface-catalog";
import {
  type SurfaceLaborOverride,
  type SurfaceLaborTabKey,
} from "@/lib/quotes/surface-labor-defaults";

const SUBSTRATE_PRODUCTIVITY_META = /^#substrate_productivity=(.+)$/;

export type SubstrateProductivityMap = Partial<
  Record<AreaSubstrateId, SurfaceLaborOverride>
>;

function parseRawPrepLines(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function isMetadataLine(line: string): boolean {
  return line.startsWith("#");
}

function prepMetadataLines(value: string | null | undefined): string[] {
  return parseRawPrepLines(value).filter(isMetadataLine);
}

function readOverrideValue(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseSubstrateProductivityJson(
  prepWork: string | null | undefined,
): SubstrateProductivityMap | null {
  for (const line of parseRawPrepLines(prepWork)) {
    const match = line.match(SUBSTRATE_PRODUCTIVITY_META);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;
      const map: SubstrateProductivityMap = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (!value || typeof value !== "object") continue;
        const record = value as Record<string, unknown>;
        const override: SurfaceLaborOverride = {};
        const sqFt = readOverrideValue(record.sqFtPerLaborHour);
        const linear = readOverrideValue(record.linearFtPerLaborHour);
        const hours = readOverrideValue(record.hoursPerUnit);
        if (sqFt != null) override.sqFtPerLaborHour = sqFt;
        if (linear != null) override.linearFtPerLaborHour = linear;
        if (hours != null) override.hoursPerUnit = hours;
        if (Object.keys(override).length > 0) {
          map[key as AreaSubstrateId] = override;
        }
      }
      return map;
    } catch {
      return null;
    }
  }
  return null;
}

export function resolveSubstrateProductivityMap(
  prepWork: string | null | undefined,
): SubstrateProductivityMap {
  return parseSubstrateProductivityJson(prepWork) ?? {};
}

export function getSubstrateProductivityOverride(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
): SurfaceLaborOverride | null {
  const stored = resolveSubstrateProductivityMap(prepWork)[substrateId];
  return stored ?? null;
}

function serializePrepWorkWithSubstrateProductivity(
  prepWork: string | null | undefined,
  map: SubstrateProductivityMap,
): string {
  const meta = prepMetadataLines(prepWork).filter(
    (line) => !SUBSTRATE_PRODUCTIVITY_META.test(line),
  );
  const hasProductivity = Object.keys(map).length > 0;
  if (hasProductivity) {
    meta.unshift(`#substrate_productivity=${JSON.stringify(map)}`);
  }
  return meta.join("\n");
}

function cleanProductivityOverride(
  value: SurfaceLaborOverride,
): SurfaceLaborOverride | null {
  const cleaned: SurfaceLaborOverride = {};
  if (value.sqFtPerLaborHour != null && value.sqFtPerLaborHour > 0) {
    cleaned.sqFtPerLaborHour = value.sqFtPerLaborHour;
  }
  if (value.linearFtPerLaborHour != null && value.linearFtPerLaborHour > 0) {
    cleaned.linearFtPerLaborHour = value.linearFtPerLaborHour;
  }
  if (value.hoursPerUnit != null && value.hoursPerUnit > 0) {
    cleaned.hoursPerUnit = value.hoursPerUnit;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export function setSubstrateProductivityOverride(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
  patch: Partial<SurfaceLaborOverride>,
): string {
  const map = { ...resolveSubstrateProductivityMap(prepWork) };
  const existing = map[substrateId] ?? {};
  const merged = { ...existing };

  if ("sqFtPerLaborHour" in patch) {
    if (patch.sqFtPerLaborHour == null) delete merged.sqFtPerLaborHour;
    else merged.sqFtPerLaborHour = patch.sqFtPerLaborHour;
  }
  if ("linearFtPerLaborHour" in patch) {
    if (patch.linearFtPerLaborHour == null) delete merged.linearFtPerLaborHour;
    else merged.linearFtPerLaborHour = patch.linearFtPerLaborHour;
  }
  if ("hoursPerUnit" in patch) {
    if (patch.hoursPerUnit == null) delete merged.hoursPerUnit;
    else merged.hoursPerUnit = patch.hoursPerUnit;
  }

  const cleaned = cleanProductivityOverride(merged);
  if (!cleaned) {
    delete map[substrateId];
  } else {
    map[substrateId] = cleaned;
  }

  return serializePrepWorkWithSubstrateProductivity(prepWork, map);
}

export function resetSubstrateProductivityOverride(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
): string {
  const map = { ...resolveSubstrateProductivityMap(prepWork) };
  delete map[substrateId];
  return serializePrepWorkWithSubstrateProductivity(prepWork, map);
}

export function substrateIdForSurfaceKey(
  surfaceKey: AreaSurfaceKey | string,
  prepWork: string | null | undefined,
  substrates?: AreaSubstrateDefinition[],
): AreaSubstrateId | null {
  const list = substrates ?? listSubstrateDefinitionsForRoom(prepWork);
  for (const substrate of list) {
    if (
      substrate.toggleKeys.includes(surfaceKey as AreaSurfaceKey) ||
      substrate.companionKeys?.includes(surfaceKey as AreaSurfaceKey)
    ) {
      return substrate.id;
    }
  }
  return null;
}

export function substrateToLaborTab(
  substrateId: AreaSubstrateId,
): SurfaceLaborTabKey | null {
  if (
    substrateId === "walls" ||
    substrateId === "closets" ||
    substrateId === "floors" ||
    substrateId === "shelves"
  ) {
    return "walls";
  }
  if (substrateId === "ceilings") return "ceilings";
  if (substrateId === "trim") return "trim";
  if (substrateId === "windows") return "windows";
  if (substrateId === "doors") return "doors";
  if (substrateId === "cabinets") return null;
  if (substrateId.startsWith("custom-")) return "walls";
  return null;
}
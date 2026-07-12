import {
  areaSurfaceByKey,
  type AreaSurfaceDefinition,
  type AreaSurfaceKey,
} from "@/lib/quotes/area-surface-catalog";
import {
  AREA_SUBSTRATES,
  isSubstrateActive,
  type AreaSubstrateDefinition,
  type AreaSubstrateId,
  type CustomSubstrateId,
} from "@/lib/quotes/area-substrates";

export type { CustomSubstrateId };

const CUSTOM_SUBSTRATES_META = /^#custom_substrates=(.+)$/;

export type CustomSubstrateEntry = {
  id: CustomSubstrateId;
  label: string;
  laborOnly?: boolean;
};

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

export function isCustomSubstrateId(id: string): id is CustomSubstrateId {
  return id.startsWith("custom-");
}

export function isCustomSurfaceKey(key: string): key is CustomSubstrateId {
  return isCustomSubstrateId(key);
}

export function newCustomSubstrateId(): CustomSubstrateId {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCustomEntry(raw: unknown): CustomSubstrateEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = String(record.id ?? "").trim();
  const label = String(record.label ?? "").trim();
  if (!isCustomSubstrateId(id) || !label) return null;
  return {
    id,
    label,
    laborOnly: record.laborOnly === true,
  };
}

function parseCustomSubstratesJson(
  prepWork: string | null | undefined,
): CustomSubstrateEntry[] | null {
  for (const line of parseRawPrepLines(prepWork)) {
    const match = line.match(CUSTOM_SUBSTRATES_META);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((row) => normalizeCustomEntry(row))
        .filter((row): row is CustomSubstrateEntry => row != null);
    } catch {
      return [];
    }
  }
  return null;
}

export function resolveCustomSubstrates(
  prepWork: string | null | undefined,
): CustomSubstrateEntry[] {
  return parseCustomSubstratesJson(prepWork) ?? [];
}

function serializePrepWorkWithCustomSubstrates(
  prepWork: string | null | undefined,
  entries: CustomSubstrateEntry[],
): string {
  const meta = prepMetadataLines(prepWork).filter(
    (line) => !CUSTOM_SUBSTRATES_META.test(line),
  );
  if (entries.length > 0) {
    meta.unshift(`#custom_substrates=${JSON.stringify(entries)}`);
  }
  return meta.join("\n");
}

export function addCustomSubstrate(
  prepWork: string | null | undefined,
  label: string,
): { prepWork: string; entry: CustomSubstrateEntry } {
  const trimmed = label.trim();
  const entry: CustomSubstrateEntry = {
    id: newCustomSubstrateId(),
    label: trimmed,
  };
  const existing = resolveCustomSubstrates(prepWork);
  return {
    prepWork: serializePrepWorkWithCustomSubstrates(prepWork, [
      ...existing,
      entry,
    ]),
    entry,
  };
}

export function removeCustomSubstrate(
  prepWork: string | null | undefined,
  id: CustomSubstrateId,
): string {
  const next = resolveCustomSubstrates(prepWork).filter((row) => row.id !== id);
  return serializePrepWorkWithCustomSubstrates(prepWork, next);
}

export function customSubstrateToDefinition(
  entry: CustomSubstrateEntry,
): AreaSubstrateDefinition {
  return {
    id: entry.id,
    label: entry.label,
    toggleKeys: [entry.id as AreaSurfaceKey],
    laborOnly: entry.laborOnly,
  };
}

export function customSubstrateSurfaceDefinition(
  entry: CustomSubstrateEntry,
): AreaSurfaceDefinition {
  return {
    key: entry.id as AreaSurfaceKey,
    label: entry.label,
    surface_type: "custom",
    rate_type: "each",
    paint_default_type: "custom",
  };
}

export function resolveCustomSubstrateById(
  prepWork: string | null | undefined,
  id: string,
): CustomSubstrateEntry | undefined {
  return resolveCustomSubstrates(prepWork).find((row) => row.id === id);
}

export function listSubstrateDefinitionsForRoom(
  prepWork: string | null | undefined,
): AreaSubstrateDefinition[] {
  const custom = resolveCustomSubstrates(prepWork).map(customSubstrateToDefinition);
  return [...AREA_SUBSTRATES, ...custom];
}

export function activeSubstrateDefinitionsForRoom(
  prepWork: string | null | undefined,
  activeKeys: Set<AreaSurfaceKey>,
): AreaSubstrateDefinition[] {
  return listSubstrateDefinitionsForRoom(prepWork).filter((substrate) =>
    isSubstrateActive(substrate, activeKeys),
  );
}

export function findSubstrateDefinition(
  prepWork: string | null | undefined,
  id: AreaSubstrateId,
): AreaSubstrateDefinition | undefined {
  return listSubstrateDefinitionsForRoom(prepWork).find((row) => row.id === id);
}

export function resolveAreaSurfaceDefinition(
  key: string,
  prepWork?: string | null,
): AreaSurfaceDefinition | undefined {
  const catalog = areaSurfaceByKey(key);
  if (catalog) return catalog;

  if (isCustomSurfaceKey(key) && prepWork) {
    const entry = resolveCustomSubstrateById(prepWork, key);
    if (entry) return customSubstrateSurfaceDefinition(entry);
  }

  return undefined;
}
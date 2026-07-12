import type { AreaSubstrateId } from "@/lib/quotes/area-substrates";
import type { QuoteJobType, QuoteSurfaceKind, QuoteRateType } from "@/types/database";

const PREP_HOURS_META = /^#prep_hours=([\d.]+)$/;
const SUBSTRATE_SCOPE_META = /^#substrate_scope=(.+)$/;
const AREA_CUSTOM_SCOPE_META = /^#area_custom_scope=(.+)$/;

export type ScopeLibraryItem = {
  id: string;
  label: string;
  category: "prep" | "paint" | "extras";
  jobTypes?: QuoteJobType[];
};

/** Billable add-on lines painters can attach per work item (qty × amount). */
export const AREA_SCOPE_LIBRARY: ScopeLibraryItem[] = [
  { id: "furniture-moving", label: "Move furniture", category: "prep" },
  { id: "pressure-wash", label: "Pressure wash (exterior)", category: "prep", jobTypes: ["exterior", "both"] },
  { id: "color-match", label: "Color match & touch-up", category: "extras" },
  { id: "cleanup", label: "Daily cleanup & walkthrough", category: "extras" },
];

export type SurfaceScopeOption = {
  id: string;
  label: string;
  surface_type: QuoteSurfaceKind;
  rate_type: QuoteRateType;
};

export const SURFACE_SCOPE_OPTIONS: SurfaceScopeOption[] = [
  { id: "walls", label: "Walls", surface_type: "wall", rate_type: "sqft" },
  { id: "ceiling", label: "Ceiling", surface_type: "ceiling", rate_type: "sqft" },
  { id: "trim", label: "Trim", surface_type: "trim", rate_type: "linear" },
  { id: "windows", label: "Windows", surface_type: "window", rate_type: "each" },
];

export type SubstrateScopeEntry = {
  id: string;
  label: string;
  qty: number;
  /** Dollar amount for this scope line (proposal / extras). */
  amount: number;
  custom?: boolean;
};

export type SubstrateScopeMap = Partial<
  Record<AreaSubstrateId, SubstrateScopeEntry[]>
>;

function isScopeMetadataLine(line: string): boolean {
  return line.startsWith("#");
}

export function newScopeEntryId(): string {
  return `scope-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundQty(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeScopeEntry(
  raw: unknown,
  index: number,
): SubstrateScopeEntry | null {
  if (typeof raw === "string") {
    const label = raw.trim();
    if (!label) return null;
    return {
      id: `legacy-${index}-${label.slice(0, 12)}`,
      label,
      qty: 1,
      amount: 0,
    };
  }
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const label = String(record.label ?? "").trim();
  if (!label) return null;
  const id =
    typeof record.id === "string" && record.id.trim()
      ? record.id.trim()
      : newScopeEntryId();
  const qty = Number(record.qty);
  const amount = Number(record.amount);
  return {
    id,
    label,
    qty: roundQty(Number.isFinite(qty) && qty > 0 ? qty : 1),
    amount: roundMoney(Number.isFinite(amount) && amount >= 0 ? amount : 0),
    custom: record.custom === true,
  };
}

function normalizeScopeEntries(raw: unknown): SubstrateScopeEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => normalizeScopeEntry(item, index))
    .filter((item): item is SubstrateScopeEntry => item != null);
}

function parseSubstrateScopeJson(
  prepWork: string | null | undefined,
): SubstrateScopeMap | null {
  for (const line of parseRawScopeLines(prepWork)) {
    const match = line.match(SUBSTRATE_SCOPE_META);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;
      const map: SubstrateScopeMap = {};
      for (const [key, value] of Object.entries(parsed)) {
        const entries = normalizeScopeEntries(value);
        if (entries.length > 0) {
          map[key as AreaSubstrateId] = entries;
        }
      }
      return map;
    } catch {
      return null;
    }
  }
  return null;
}

function hasSubstrateScopeMeta(prepWork: string | null | undefined): boolean {
  return parseSubstrateScopeJson(prepWork) != null;
}

/** Per-substrate scope entries stored in room prep_work metadata. */
export function resolveSubstrateScopeMap(
  prepWork: string | null | undefined,
): SubstrateScopeMap {
  const stored = parseSubstrateScopeJson(prepWork);
  if (stored) return stored;

  const legacy = parseScopeLines(prepWork);
  if (legacy.length > 0) {
    return {
      walls: legacy.map((label, index) => ({
        id: `legacy-walls-${index}`,
        label,
        qty: 1,
        amount: 0,
      })),
    };
  }
  return {};
}

export function getSubstrateScopeEntries(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
): SubstrateScopeEntry[] {
  const map = resolveSubstrateScopeMap(prepWork);
  return map[substrateId] ?? [];
}

/** @deprecated Use getSubstrateScopeEntries */
export function getSubstrateScopeLines(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
): string[] {
  return getSubstrateScopeEntries(prepWork, substrateId).map((entry) =>
    formatScopeEntryLine(entry),
  );
}

export function formatScopeEntryLine(entry: SubstrateScopeEntry): string {
  const parts = [entry.label];
  if (entry.qty !== 1) {
    parts.push(`qty ${entry.qty}`);
  }
  if (entry.amount > 0) {
    parts.push(`$${entry.amount.toFixed(2)}`);
  }
  return parts.join(" · ");
}

export function substrateScopeEntryTotal(
  entries: SubstrateScopeEntry[],
): number {
  return roundMoney(
    entries.reduce((sum, entry) => sum + entry.qty * entry.amount, 0),
  );
}

function serializePrepWorkWithSubstrateScope(
  prepWork: string | null | undefined,
  map: SubstrateScopeMap,
): string {
  const meta = scopeMetadataLines(prepWork).filter(
    (line) => !SUBSTRATE_SCOPE_META.test(line),
  );
  const hasScope = Object.values(map).some(
    (entries) => (entries?.length ?? 0) > 0,
  );
  if (hasScope) {
    meta.unshift(`#substrate_scope=${JSON.stringify(map)}`);
  }
  return meta.join("\n");
}

export function setSubstrateScopeEntries(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
  entries: SubstrateScopeEntry[],
): string {
  const map = { ...resolveSubstrateScopeMap(prepWork) };
  const normalized = entries
    .map((entry) => ({
      ...entry,
      label: entry.label.trim(),
      qty: roundQty(Math.max(entry.qty, 0.01)),
      amount: roundMoney(Math.max(entry.amount, 0)),
    }))
    .filter((entry) => entry.label.length > 0);

  if (normalized.length > 0) {
    map[substrateId] = normalized;
  } else {
    delete map[substrateId];
  }
  return serializePrepWorkWithSubstrateScope(prepWork, map);
}

export function addSubstrateScopeEntry(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
  entry: Omit<SubstrateScopeEntry, "id"> & { id?: string },
): string {
  const trimmed = entry.label.trim();
  if (!trimmed) return prepWork ?? "";

  const next: SubstrateScopeEntry = {
    id: entry.id ?? newScopeEntryId(),
    label: trimmed,
    qty: roundQty(entry.qty > 0 ? entry.qty : 1),
    amount: roundMoney(entry.amount >= 0 ? entry.amount : 0),
    custom: entry.custom,
  };

  const existing = getSubstrateScopeEntries(prepWork, substrateId);
  return setSubstrateScopeEntries(prepWork, substrateId, [...existing, next]);
}

export function updateSubstrateScopeEntry(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
  entryId: string,
  patch: Partial<Pick<SubstrateScopeEntry, "label" | "qty" | "amount">>,
): string {
  const entries = getSubstrateScopeEntries(prepWork, substrateId).map(
    (entry) => {
      if (entry.id !== entryId) return entry;
      return {
        ...entry,
        label:
          patch.label !== undefined ? patch.label.trim() : entry.label,
        qty:
          patch.qty !== undefined
            ? roundQty(Math.max(patch.qty, 0.01))
            : entry.qty,
        amount:
          patch.amount !== undefined
            ? roundMoney(Math.max(patch.amount, 0))
            : entry.amount,
      };
    },
  );
  return setSubstrateScopeEntries(
    prepWork,
    substrateId,
    entries.filter((entry) => entry.label.length > 0),
  );
}

export function removeSubstrateScopeEntry(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
  entryId: string,
): string {
  const entries = getSubstrateScopeEntries(prepWork, substrateId).filter(
    (entry) => entry.id !== entryId,
  );
  return setSubstrateScopeEntries(prepWork, substrateId, entries);
}

/** @deprecated Use addSubstrateScopeEntry */
export function addSubstrateScopeLine(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
  label: string,
): string {
  return addSubstrateScopeEntry(prepWork, substrateId, {
    label,
    qty: 1,
    amount: 0,
  });
}

/** @deprecated Use removeSubstrateScopeEntry */
export function removeSubstrateScopeLine(
  prepWork: string | null | undefined,
  substrateId: AreaSubstrateId,
  label: string,
): string {
  const entries = getSubstrateScopeEntries(prepWork, substrateId);
  const match = entries.find((entry) => entry.label === label);
  if (!match) return prepWork ?? "";
  return removeSubstrateScopeEntry(prepWork, substrateId, match.id);
}

/** Flat scope lines for legacy consumers (proposal text, exports). */
export function allScopeLinesFromPrepWork(
  prepWork: string | null | undefined,
): string[] {
  const map = resolveSubstrateScopeMap(prepWork);
  const lines: string[] = [];
  for (const substrateEntries of Object.values(map)) {
    for (const entry of substrateEntries ?? []) {
      const line = formatScopeEntryLine(entry);
      if (!lines.includes(line)) lines.push(line);
    }
  }
  return lines;
}

function parseRawScopeLines(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

/** User-visible scope checklist lines (excludes internal metadata). */
export function parseScopeLines(value: string | null | undefined): string[] {
  if (hasSubstrateScopeMeta(value)) {
    return allScopeLinesFromPrepWork(value);
  }
  return parseRawScopeLines(value).filter((line) => !isScopeMetadataLine(line));
}

export function joinScopeLines(lines: string[]): string {
  return lines.join("\n");
}

function scopeMetadataLines(value: string | null | undefined): string[] {
  return parseRawScopeLines(value).filter(isScopeMetadataLine);
}

function parseAreaCustomScopeLabelsJson(
  prepWork: string | null | undefined,
): string[] {
  for (const line of parseRawScopeLines(prepWork)) {
    const match = line.match(AREA_CUSTOM_SCOPE_META);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((raw) => String(raw ?? "").trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

function libraryLabelSet(jobType?: QuoteJobType): Set<string> {
  const items = jobType ? scopeLibraryForJobType(jobType) : AREA_SCOPE_LIBRARY;
  return new Set(items.map((item) => item.label));
}

/** Custom scope labels defined for the whole area (shared across work items). */
export function resolveAreaCustomScopeLabels(
  prepWork: string | null | undefined,
  jobType?: QuoteJobType,
): string[] {
  const labels = new Set(parseAreaCustomScopeLabelsJson(prepWork));
  const libraryLabels = libraryLabelSet(jobType);

  for (const entries of Object.values(resolveSubstrateScopeMap(prepWork))) {
    for (const entry of entries ?? []) {
      const label = entry.label.trim();
      if (!label) continue;
      if (entry.custom || !libraryLabels.has(label)) {
        labels.add(label);
      }
    }
  }

  return [...labels].sort((a, b) => a.localeCompare(b));
}

function serializePrepWorkWithAreaCustomScope(
  prepWork: string | null | undefined,
  labels: string[],
): string {
  const meta = scopeMetadataLines(prepWork).filter(
    (line) => !AREA_CUSTOM_SCOPE_META.test(line),
  );
  const unique = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  if (unique.length > 0) {
    meta.unshift(`#area_custom_scope=${JSON.stringify(unique)}`);
  }
  return meta.join("\n");
}

export function addAreaCustomScopeLabel(
  prepWork: string | null | undefined,
  label: string,
  jobType?: QuoteJobType,
): string {
  const trimmed = label.trim();
  if (!trimmed) return prepWork ?? "";

  const next = resolveAreaCustomScopeLabels(prepWork, jobType);
  if (next.includes(trimmed)) {
    return serializePrepWorkWithAreaCustomScope(prepWork, next);
  }

  return serializePrepWorkWithAreaCustomScope(prepWork, [...next, trimmed]);
}

export function prepLaborHoursOverride(
  prepWork: string | null | undefined,
): number | null {
  for (const line of parseRawScopeLines(prepWork)) {
    const match = line.match(PREP_HOURS_META);
    if (match) return Number(match[1]) || 0;
  }
  return null;
}

export function setPrepLaborHoursOverride(
  prepWork: string | null | undefined,
  hours: number | null,
): string {
  const meta = scopeMetadataLines(prepWork).filter(
    (line) => !PREP_HOURS_META.test(line),
  );
  const scope = parseScopeLines(prepWork);
  if (hours != null && hours > 0) {
    meta.unshift(`#prep_hours=${hours}`);
  }
  return joinScopeLines([...meta, ...scope]);
}

function prepHoursForCondition(condition: string): number {
  if (condition === "poor") return 4;
  if (condition === "fair") return 2;
  if (condition === "good") return 1;
  return 0;
}

export function checkedPrepScopeLines(
  prepWork: string | null | undefined,
  jobType: QuoteJobType,
): string[] {
  const prepLabels = new Set(
    scopeLibraryForJobType(jobType)
      .filter((item) => item.category === "prep")
      .map((item) => item.label),
  );
  return getSubstrateScopeEntriesFromAllSubstrates(prepWork)
    .map((entry) => entry.label)
    .filter((line) => prepLabels.has(line));
}

function getSubstrateScopeEntriesFromAllSubstrates(
  prepWork: string | null | undefined,
): SubstrateScopeEntry[] {
  const map = resolveSubstrateScopeMap(prepWork);
  return Object.values(map).flatMap((entries) => entries ?? []);
}

/** Prep labor only when prep scope items are checked (not paint/extras). */
export function prepLaborHoursForRoom(
  room: {
    prep_work?: string | null;
    condition?: string | null;
  },
  jobType: QuoteJobType,
): number {
  const checkedPrep = checkedPrepScopeLines(room.prep_work, jobType);
  if (checkedPrep.length === 0) return 0;

  const override = prepLaborHoursOverride(room.prep_work);
  if (override != null) return Math.max(0, override);

  const fromScope = Math.max(0.5, checkedPrep.length * 0.5);
  const fromCondition = prepHoursForCondition(room.condition ?? "");
  return Math.max(fromScope, fromCondition);
}

export function toggleScopeLine(
  current: string | null | undefined,
  label: string,
  enabled: boolean,
): string {
  const meta = scopeMetadataLines(current);
  const lines = parseScopeLines(current);
  const exists = lines.includes(label);
  let nextScope = lines;
  if (enabled && !exists) nextScope = [...lines, label];
  if (!enabled && exists) {
    nextScope = lines.filter((line) => line !== label);
  }
  return joinScopeLines([...meta, ...nextScope]);
}

export function scopeLibraryForJobType(jobType: QuoteJobType): ScopeLibraryItem[] {
  return AREA_SCOPE_LIBRARY.filter(
    (item) =>
      !item.jobTypes ||
      item.jobTypes.includes(jobType) ||
      (jobType === "specialty" && !item.jobTypes),
  );
}

/** Default scope for a newly added area (empty — scope is per work item). */
export function defaultScopePrepWorkForJobType(_jobType: QuoteJobType): string {
  return "";
}
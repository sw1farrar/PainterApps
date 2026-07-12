const AREA_OVERHEAD_META = /^#area_overhead=(.+)$/;

export type SundriesMode = "materialsPct" | "fixedAmount";

export type AreaOverheadSettings = {
  /** Which sundries input drives pricing. */
  mode: SundriesMode;
  /** % of materials cost (paint, sundries) when mode is materialsPct. */
  materialsPct: number;
  /** Fixed sundries cost at cost when mode is fixedAmount. */
  fixedAmount: number;
};

const EMPTY_OVERHEAD: AreaOverheadSettings = {
  mode: "materialsPct",
  materialsPct: 0,
  fixedAmount: 0,
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

function normalizePct(value: unknown): number {
  const pct = Number(value);
  if (!Number.isFinite(pct) || pct < 0) return 0;
  return Math.round(pct * 10) / 10;
}

function normalizeMoney(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
}

function normalizeMode(value: unknown, legacyFixedAmount: number): SundriesMode {
  if (value === "fixedAmount" || value === "materialsPct") {
    return value;
  }
  return legacyFixedAmount > 0 ? "fixedAmount" : "materialsPct";
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseAreaOverheadJson(
  prepWork: string | null | undefined,
): AreaOverheadSettings | null {
  for (const line of parseRawPrepLines(prepWork)) {
    const match = line.match(AREA_OVERHEAD_META);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;
      const fixedAmount = normalizeMoney(parsed.fixedAmount);
      return {
        mode: normalizeMode(parsed.mode, fixedAmount),
        materialsPct: normalizePct(parsed.materialsPct),
        fixedAmount,
      };
    } catch {
      return null;
    }
  }
  return null;
}

export function resolveAreaOverhead(
  prepWork: string | null | undefined,
): AreaOverheadSettings {
  return parseAreaOverheadJson(prepWork) ?? EMPTY_OVERHEAD;
}

function serializePrepWorkWithAreaOverhead(
  prepWork: string | null | undefined,
  settings: AreaOverheadSettings,
): string {
  const meta = prepMetadataLines(prepWork).filter(
    (line) => !AREA_OVERHEAD_META.test(line),
  );
  const hasOverhead =
    settings.materialsPct > 0 || settings.fixedAmount > 0;
  if (hasOverhead) {
    meta.unshift(`#area_overhead=${JSON.stringify(settings)}`);
  }
  return meta.join("\n");
}

export function setAreaOverhead(
  prepWork: string | null | undefined,
  patch: Partial<AreaOverheadSettings>,
): string {
  const current = resolveAreaOverhead(prepWork);
  const next: AreaOverheadSettings = {
    mode:
      patch.mode !== undefined
        ? normalizeMode(patch.mode, current.fixedAmount)
        : current.mode,
    materialsPct:
      patch.materialsPct !== undefined
        ? normalizePct(patch.materialsPct)
        : current.materialsPct,
    fixedAmount:
      patch.fixedAmount !== undefined
        ? normalizeMoney(patch.fixedAmount)
        : current.fixedAmount,
  };
  return serializePrepWorkWithAreaOverhead(prepWork, next);
}

export function computeAreaOverheadAtCost(
  materialsCostAtCost: number,
  _laborCostAtCost: number,
  settings: AreaOverheadSettings,
): {
  materialsOverhead: number;
  laborOverhead: number;
  total: number;
} {
  if (settings.mode === "fixedAmount") {
    const total = roundMoney(settings.fixedAmount);
    return {
      materialsOverhead: total,
      laborOverhead: 0,
      total,
    };
  }

  const materialsOverhead = roundMoney(
    materialsCostAtCost * (settings.materialsPct / 100),
  );
  return {
    materialsOverhead,
    laborOverhead: 0,
    total: materialsOverhead,
  };
}

export function isSundriesFixedAmount(settings: AreaOverheadSettings): boolean {
  return settings.mode === "fixedAmount";
}
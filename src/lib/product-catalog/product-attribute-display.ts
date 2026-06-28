import type {
  PaintProductApplication,
  PaintProductBase,
  PaintProductCategory,
  PaintProductUse,
  PaintResinSystem,
  PaintSheen,
  PaintSubstrate,
  PaintVocLevel,
} from "@/lib/product-catalog/types";

const RESIN_SYSTEM_LABELS: Record<PaintResinSystem, string> = {
  acrylic: "Acrylic",
  "100_percent_acrylic": "100% Acrylic",
  vinyl_acrylic: "Vinyl Acrylic",
  alkyd: "Alkyd",
  alkyd_modified: "Alkyd Modified",
  urethane_modified_acrylic: "Urethane-Modified Acrylic",
  urethane_alkyd: "Urethane Alkyd",
  polyurethane: "Polyurethane",
  epoxy: "Epoxy",
  silicone: "Silicone",
  latex: "Latex",
  oil: "Oil",
  unknown: "Unknown",
};

const VOC_LEVEL_LABELS: Record<Exclude<PaintVocLevel, "unknown">, string> = {
  zero: "Zero VOC",
  low: "Low VOC",
  standard: "Standard VOC",
};

export function formatSlugLabel(slug: string): string {
  if (slug === "100_percent_acrylic") return "100% Acrylic";
  return slug
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatResinSystem(
  value: PaintResinSystem | null | undefined,
): string {
  if (!value || value === "unknown") return "—";
  return RESIN_SYSTEM_LABELS[value] ?? formatSlugLabel(value);
}

export function formatVocLevel(value: PaintVocLevel | null | undefined): string {
  if (!value || value === "unknown") return "—";
  return VOC_LEVEL_LABELS[value] ?? formatSlugLabel(value);
}

export function formatApplicationType(
  value: PaintProductApplication,
): string {
  if (value === "both") return "Interior & Exterior";
  if (value === "exterior") return "Exterior";
  return "Interior";
}

export function formatCategory(value: PaintProductCategory): string {
  if (value === "primer") return "Primer";
  if (value === "sealer") return "Sealer";
  if (value === "undercoater") return "Undercoater";
  return "Paint";
}

export function formatBaseType(value: PaintProductBase): string {
  if (value === "water") return "Water-based";
  if (value === "oil") return "Oil-based";
  if (value === "solvent") return "Solvent-based";
  return "Unknown base";
}

export function formatSheenOptionsForDisplay(
  sheenOptions: string[],
  sheens: PaintSheen[],
): string[] {
  if (sheenOptions.length > 0) return sheenOptions;
  return sheens.map((sheen) => formatSlugLabel(sheen));
}

export function formatEnumSlugList(values: string[]): string {
  return values.length > 0 ? values.map((value) => formatSlugLabel(value)).join(", ") : "—";
}

export function formatProductUses(values: PaintProductUse[]): string {
  return formatEnumSlugList(values);
}

export function formatSubstrates(values: PaintSubstrate[]): string {
  return formatEnumSlugList(values);
}

export function formatVolumeSolids(
  pct: number | null | undefined,
  label: string | null | undefined,
): string {
  if (label?.trim()) return label.trim();
  if (pct != null) return `${pct}%`;
  return "—";
}

export type ProductCapabilityFlags = {
  isSelfPriming?: boolean;
  isStainBlocking?: boolean;
  isMoldMildewResistant?: boolean;
  isScrubbable?: boolean;
  isOneCoat?: boolean;
};

export function listProductCapabilities(
  flags: ProductCapabilityFlags,
): string[] {
  const items: string[] = [];
  if (flags.isSelfPriming) items.push("Self-priming");
  if (flags.isStainBlocking) items.push("Stain blocking");
  if (flags.isMoldMildewResistant) items.push("Mold & mildew resistant");
  if (flags.isScrubbable) items.push("Scrubbable");
  if (flags.isOneCoat) items.push("One-coat coverage");
  return items;
}

export function formatProductCapabilities(flags: ProductCapabilityFlags): string {
  const items = listProductCapabilities(flags);
  return items.length > 0 ? items.join(", ") : "—";
}
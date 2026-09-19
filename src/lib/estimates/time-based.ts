export type RateUnit = "sqft_per_hr" | "lnft_per_hr" | "hr_per_item";

export type CoatRates = {
  1: number;
  2: number;
  3: number;
};

export type ProductionRate = {
  id: string;
  category: string;
  name: string;
  unit: RateUnit;
  coats: CoatRates;
  materialSpreadSqftGal?: number;
  materialCostPerGal?: number;
};

export type AreaKind = "room" | "surface";

export type AreaInput = {
  name: string;
  kind: AreaKind;
  length: number;
  width: number;
  height: number;
  openingSqft?: number;
};

export type SurfaceInput = {
  label: string;
  unit: RateUnit;
  coats: 1 | 2 | 3;
  rate: number;
  qty?: number;
  prepHours?: number;
  materialSpreadSqftGal?: number;
  materialCostPerGal?: number;
};

export type AreaTakeoff = {
  wallSqft: number;
  ceilingSqft: number;
  baseLnft: number;
};

export function areaTakeoff(area: AreaInput): AreaTakeoff {
  const L = Math.max(0, area.length);
  const W = Math.max(0, area.width);
  const H = Math.max(0, area.height);
  const openings = Math.max(0, area.openingSqft ?? 0);
  if (area.kind === "surface") {
    const plane = L * H || W * H;
    return {
      wallSqft: Math.max(0, plane - openings),
      ceilingSqft: 0,
      baseLnft: L || W,
    };
  }
  const perimeter = 2 * (L + W);
  return {
    wallSqft: Math.max(0, perimeter * H - openings),
    ceilingSqft: L * W,
    baseLnft: perimeter,
  };
}

export function roundHours(hours: number) {
  if (hours <= 0) return 0;
  return Math.ceil(hours * 2) / 2;
}

export function hoursForSurface(qty: number, rate: number, unit: RateUnit) {
  if (rate <= 0 || qty <= 0) return 0;
  const raw = unit === "hr_per_item" ? qty * rate : qty / rate;
  return roundHours(raw);
}

export function gallonsFor(qtySqft: number, spreadSqftGal: number, coats: number) {
  if (spreadSqftGal <= 0 || qtySqft <= 0) return 0;
  return (qtySqft * coats) / spreadSqftGal;
}

export function rateForCoats(coats: CoatRates, n: 1 | 2 | 3) {
  return coats[n];
}

export type SurfaceResult = {
  label: string;
  qty: number;
  hours: number;
  prepHours: number;
  gallons: number;
  material: number;
};

export type AreaResult = {
  name: string;
  takeoff: AreaTakeoff;
  surfaces: SurfaceResult[];
  hours: number;
  labor: number;
  material: number;
};

export type EstimateTotals = {
  hours: number;
  labor: number;
  material: number;
  total: number;
  areas: AreaResult[];
};

function qtyForSurface(area: AreaInput, surface: SurfaceInput): number {
  if (surface.qty != null) return surface.qty;
  const t = areaTakeoff(area);
  const name = surface.label.toLowerCase();
  if (surface.unit === "hr_per_item") return 1;
  if (surface.unit === "lnft_per_hr") return t.baseLnft;
  if (name.includes("ceiling")) return t.ceilingSqft;
  return t.wallSqft;
}

export function priceArea(
  area: AreaInput,
  surfaces: SurfaceInput[],
  hourlyRate: number,
): AreaResult {
  const takeoff = areaTakeoff(area);
  const priced = surfaces.map((s) => {
    const qty = qtyForSurface(area, s);
    const hours = hoursForSurface(qty, s.rate, s.unit);
    const prep = Math.max(0, s.prepHours ?? 0);
    const gallons =
      s.unit === "sqft_per_hr" && s.materialSpreadSqftGal
        ? gallonsFor(qty, s.materialSpreadSqftGal, s.coats)
        : 0;
    const material = gallons * (s.materialCostPerGal ?? 0);
    return {
      label: s.label,
      qty,
      hours,
      prepHours: prep,
      gallons,
      material,
    };
  });
  const hours = priced.reduce((sum, s) => sum + s.hours + s.prepHours, 0);
  return {
    name: area.name,
    takeoff,
    surfaces: priced,
    hours,
    labor: hours * hourlyRate,
    material: priced.reduce((sum, s) => sum + s.material, 0),
  };
}

export function priceEstimate(
  areas: Array<{ area: AreaInput; surfaces: SurfaceInput[] }>,
  hourlyRate: number,
): EstimateTotals {
  const priced = areas.map((a) => priceArea(a.area, a.surfaces, hourlyRate));
  const hours = priced.reduce((sum, a) => sum + a.hours, 0);
  const labor = priced.reduce((sum, a) => sum + a.labor, 0);
  const material = priced.reduce((sum, a) => sum + a.material, 0);
  return {
    hours,
    labor,
    material,
    total: labor + material,
    areas: priced,
  };
}

/** Paint Scout published bedroom: 12×15×8, 2 coats. */
export function paintScoutBedroomExample(hourlyRate = 67) {
  const area: AreaInput = {
    name: "Bedroom",
    kind: "room",
    length: 12,
    width: 15,
    height: 8,
  };
  const surfaces: SurfaceInput[] = [
    { label: "Walls", unit: "sqft_per_hr", coats: 2, rate: 85 },
    { label: "Ceiling", unit: "sqft_per_hr", coats: 2, rate: 60 },
    { label: "Baseboards", unit: "lnft_per_hr", coats: 2, rate: 25 },
    { label: "Window frames", unit: "hr_per_item", coats: 2, rate: 0.5, qty: 2 },
    { label: "Door & frame 1 side", unit: "hr_per_item", coats: 2, rate: 1.5, qty: 1 },
  ];
  return priceArea(area, surfaces, hourlyRate);
}

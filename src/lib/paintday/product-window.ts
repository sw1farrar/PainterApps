import { PRODUCTS } from "@/data/tds/corpus";

export type ProductWindow = {
  minTempF: number;
  maxTempF: number;
  maxHumidityPct: number;
  minDewSpreadF?: number;
  rainReadyMinutes?: number;
  recoatHours?: number;
  name?: string;
};

export const LATEX_WINDOW: ProductWindow = {
  minTempF: 50,
  maxTempF: 90,
  maxHumidityPct: 85,
  minDewSpreadF: 5,
  rainReadyMinutes: 240,
  recoatHours: 4,
  name: "Architectural latex",
};

export const LATITUDE_WINDOW: ProductWindow = {
  minTempF: 35,
  maxTempF: 120,
  maxHumidityPct: 85,
  minDewSpreadF: 5,
  rainReadyMinutes: 60,
  recoatHours: 4,
  name: "Sherwin-Williams Latitude",
};

export const DURATION_WINDOW: ProductWindow = {
  minTempF: 35,
  maxTempF: 100,
  maxHumidityPct: 85,
  minDewSpreadF: 5,
  rainReadyMinutes: 60,
  recoatHours: 4,
  name: "Sherwin-Williams Duration",
};

export const COAT_PROFILES = [
  { id: "latex", window: LATEX_WINDOW },
  { id: "duration", window: DURATION_WINDOW },
  { id: "latitude", window: LATITUDE_WINDOW },
] as const;

export type CoatProfileId = (typeof COAT_PROFILES)[number]["id"];

export function windowFromCoat(id: string | undefined): ProductWindow | undefined {
  return COAT_PROFILES.find((p) => p.id === id)?.window;
}

export function windowFromTopcoatName(name: string | undefined): ProductWindow | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  if (lower.includes("latitude")) return LATITUDE_WINDOW;
  if (lower.includes("duration")) return DURATION_WINDOW;
  const product = PRODUCTS.find(
    (p) => p.name === name || name.includes(p.name) || p.name.includes(name),
  );
  if (!product) return undefined;
  return windowFromProduct(product);
}

function windowFromProduct(product: {
  name: string;
  minTempF: number;
  maxTempF: number;
  maxHumidityPct: number;
  minDewSpreadF?: number;
  rainReadyMinutes?: number;
  recoatHours?: number;
}): ProductWindow {
  return {
    minTempF: product.minTempF,
    maxTempF: product.maxTempF,
    maxHumidityPct: product.maxHumidityPct,
    minDewSpreadF: product.minDewSpreadF ?? 5,
    rainReadyMinutes: product.rainReadyMinutes ?? 240,
    recoatHours: product.recoatHours ?? 4,
    name: product.name,
  };
}

export { windowFromProduct };

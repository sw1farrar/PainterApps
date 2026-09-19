import { PRODUCTS } from "@/data/tds/corpus";

export type ProductWindow = {
  minTempF: number;
  maxTempF: number;
  maxHumidityPct: number;
  name?: string;
};

export const LATEX_WINDOW: ProductWindow = {
  minTempF: 50,
  maxTempF: 90,
  maxHumidityPct: 85,
  name: "Architectural latex",
};

export function windowFromTopcoatName(name: string | undefined): ProductWindow | undefined {
  if (!name) return undefined;
  const product = PRODUCTS.find(
    (p) => p.name === name || name.includes(p.name) || p.name.includes(name),
  );
  if (!product) return undefined;
  return {
    minTempF: product.minTempF,
    maxTempF: product.maxTempF,
    maxHumidityPct: product.maxHumidityPct,
    name: product.name,
  };
}

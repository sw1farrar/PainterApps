import { MANUFACTURERS, PRODUCTS, SYSTEMS } from "@/data/tds/corpus";
import type { Manufacturer, TdsProduct, TdsSystem } from "@/lib/systems/types";

export type Catalog = {
  manufacturers: Manufacturer[];
  products: TdsProduct[];
  systems: TdsSystem[];
};

export const CORPUS_CATALOG: Catalog = {
  manufacturers: MANUFACTURERS,
  products: PRODUCTS,
  systems: SYSTEMS,
};

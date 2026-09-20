import { loadCatalog } from "@/lib/systems/catalog";
import {
  windowFromProduct,
  windowFromTopcoatName,
  type ProductWindow,
} from "@/lib/paintday/product-window";

export async function windowFromTopcoatNameLive(
  name: string | undefined,
): Promise<ProductWindow | undefined> {
  const fromStatic = windowFromTopcoatName(name);
  if (!name) return fromStatic;
  try {
    const catalog = await loadCatalog();
    const lower = name.toLowerCase();
    const product = catalog.products.find(
      (p) =>
        p.name === name ||
        lower.includes(p.name.toLowerCase()) ||
        p.name.toLowerCase().includes(lower),
    );
    if (product) return windowFromProduct(product);
  } catch {
    // fall through
  }
  return fromStatic;
}

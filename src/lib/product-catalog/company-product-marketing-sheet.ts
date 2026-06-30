import { loadCatalogProduct } from "@/lib/product-catalog/load-catalog-product";
import { loadCompanyPaintProductById } from "@/lib/paint-library/load-company-paint-products";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import {
  buildCompanyProductMarketingSheetView,
  type ProductMarketingSheetView,
} from "@/lib/product-catalog/product-marketing-sheet";
import {
  findPaintManufacturerByName,
  resolveManufacturerLogoPublicUrl,
} from "@/lib/product-catalog/resolve-manufacturer-logo-url";

export type RenderCompanyProductMarketingSheetPdfResult =
  | { buffer: Buffer; filename: string; view: ProductMarketingSheetView }
  | { error: string };

async function resolveManufacturerLogoUrl(
  product: CompanyPaintProductRow,
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (product.paint_product_id) {
    const platformProduct = await loadCatalogProduct(product.paint_product_id);
    if (
      !("error" in platformProduct) &&
      platformProduct.manufacturer_logo_url
    ) {
      return platformProduct.manufacturer_logo_url;
    }
  }

  const manufacturerName = product.manufacturer_name?.trim();
  if (!manufacturerName) return null;

  const manufacturer = await findPaintManufacturerByName(manufacturerName);
  if (!manufacturer) return null;

  return resolveManufacturerLogoPublicUrl(supabaseUrl, manufacturer);
}

export async function buildCompanyProductMarketingSheetPreviewView(
  product: CompanyPaintProductRow,
): Promise<ProductMarketingSheetView> {
  const manufacturerLogoUrl = await resolveManufacturerLogoUrl(product);
  return buildCompanyProductMarketingSheetView(product, { manufacturerLogoUrl });
}

export async function loadCompanyProductForMarketingSheetPdf({
  companyId,
  productId,
}: {
  companyId: string;
  productId: string;
}): Promise<CompanyPaintProductRow | null> {
  return loadCompanyPaintProductById({ companyId, productId });
}
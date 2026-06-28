import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import { loadCatalogProduct } from "@/lib/product-catalog/load-catalog-product";
import {
  buildProductMarketingSheetView,
  productMarketingSheetFilename,
  type ProductMarketingSheetView,
} from "@/lib/product-catalog/product-marketing-sheet";
import { ProductMarketingSheetPdfDocument } from "@/lib/product-catalog/product-marketing-sheet-pdf";
import { resolveMarketingSheetPdfImageDataUrls } from "@/lib/product-catalog/product-marketing-sheet-pdf-assets";
import { registerSellSheetPdfFonts } from "@/lib/sell-sheet/pdf-fonts";

export type RenderProductMarketingSheetPdfResult =
  | { buffer: Buffer; filename: string; view: ProductMarketingSheetView }
  | { error: string };

export async function renderProductMarketingSheetPdf(
  productId: string,
): Promise<RenderProductMarketingSheetPdfResult> {
  const product = await loadCatalogProduct(productId);
  if ("error" in product) {
    return { error: product.error };
  }

  const view = buildProductMarketingSheetView(product);
  const assets = await resolveMarketingSheetPdfImageDataUrls(productId);
  if ("error" in assets) {
    return { error: assets.error };
  }

  const pdfView: ProductMarketingSheetView = {
    ...view,
    canImageUrl: assets.canImageDataUrl ?? view.canImageUrl,
    manufacturerLogoUrl: assets.manufacturerLogoDataUrl ?? view.manufacturerLogoUrl,
  };

  registerSellSheetPdfFonts();

  const buffer = await renderToBuffer(
    <ProductMarketingSheetPdfDocument view={pdfView} />,
  );

  return {
    buffer: Buffer.from(buffer),
    filename: productMarketingSheetFilename(pdfView),
    view: pdfView,
  };
}
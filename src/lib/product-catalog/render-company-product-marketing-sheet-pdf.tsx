import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import {
  buildCompanyProductMarketingSheetPreviewView,
  loadCompanyProductForMarketingSheetPdf,
  type RenderCompanyProductMarketingSheetPdfResult,
} from "@/lib/product-catalog/company-product-marketing-sheet";
import { ProductMarketingSheetPdfDocument } from "@/lib/product-catalog/product-marketing-sheet-pdf";
import {
  fetchHttpImageAsDataUrl,
  isPdfEmbeddedImageSrc,
} from "@/lib/product-catalog/product-marketing-sheet-pdf-assets";
import {
  productMarketingSheetFilename,
  type ProductMarketingSheetView,
} from "@/lib/product-catalog/product-marketing-sheet";
import { registerSellSheetPdfFonts } from "@/lib/sell-sheet/pdf-fonts";

export async function renderCompanyProductMarketingSheetPdf({
  companyId,
  productId,
}: {
  companyId: string;
  productId: string;
}): Promise<RenderCompanyProductMarketingSheetPdfResult> {
  const product = await loadCompanyProductForMarketingSheetPdf({
    companyId,
    productId,
  });
  if (!product) {
    return { error: "Product not found." };
  }

  const view = await buildCompanyProductMarketingSheetPreviewView(product);

  const [canImageDataUrl, manufacturerLogoDataUrl] = await Promise.all([
    isPdfEmbeddedImageSrc(view.canImageUrl)
      ? view.canImageUrl
      : fetchHttpImageAsDataUrl(view.canImageUrl),
    fetchHttpImageAsDataUrl(view.manufacturerLogoUrl),
  ]);

  const pdfView: ProductMarketingSheetView = {
    ...view,
    canImageUrl: canImageDataUrl ?? view.canImageUrl,
    manufacturerLogoUrl: manufacturerLogoDataUrl ?? view.manufacturerLogoUrl,
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
import { NextResponse } from "next/server";

import { requireOnboarded } from "@/lib/auth/session";
import { renderCompanyProductMarketingSheetPdf } from "@/lib/product-catalog/render-company-product-marketing-sheet-pdf";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { company } = await requireOnboarded();
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { productId } = await context.params;
    const result = await renderCompanyProductMarketingSheetPdf({
      companyId: company.id,
      productId,
    });

    if ("error" in result) {
      const status = result.error === "Product not found." ? 404 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err) {
    console.error("[company-product-marketing-sheet]", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
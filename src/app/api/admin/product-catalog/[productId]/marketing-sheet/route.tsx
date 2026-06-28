import { NextResponse } from "next/server";

import { getSession, isSiteAdmin } from "@/lib/auth/session";
import { renderProductMarketingSheetPdf } from "@/lib/product-catalog/render-product-marketing-sheet-pdf";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isSiteAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { productId } = await context.params;
    const result = await renderProductMarketingSheetPdf(productId);

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
    console.error("[product-marketing-sheet]", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
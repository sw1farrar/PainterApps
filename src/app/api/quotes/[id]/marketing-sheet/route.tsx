import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MarketingSheetDocument } from "@/lib/quotes/pdf/marketing-sheet";
import type {
  Company,
  Customer,
  Quote,
  QuoteLineItem,
  QuoteRoom,
  QuoteTier,
} from "@/types/database";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { company } = await requireOnboarded();
    const supabase = await createClient();

    const [
      { data: quote },
      { data: customerRow },
      { data: rooms },
      { data: lineItems },
      { data: tiers },
    ] = await Promise.all([
      supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .eq("company_id", company!.id)
        .single(),
      supabase
        .from("quotes")
        .select("customers(*)")
        .eq("id", id)
        .single(),
      supabase.from("quote_rooms").select("*").eq("quote_id", id),
      supabase.from("quote_line_items").select("*").eq("quote_id", id),
      supabase.from("quote_tiers").select("*").eq("quote_id", id),
    ]);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const customerData = (customerRow as { customers: Customer } | null)
      ?.customers;

    if (!customerData) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const buffer = await renderToBuffer(
      <MarketingSheetDocument
        company={company as Company}
        customer={customerData}
        quote={quote as Quote}
        rooms={(rooms ?? []) as QuoteRoom[]}
        lineItems={(lineItems ?? []) as QuoteLineItem[]}
        tiers={(tiers ?? []) as QuoteTier[]}
      />,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quote-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[marketing-sheet]", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
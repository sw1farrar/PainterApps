"use client";

import { Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PortalQuoteView } from "@/components/quotes/PortalQuoteView";
import { buildTierPaintSummaries } from "@/lib/paint-library/tier-display";
import {
  buildPreviewOptionalItems,
  buildPreviewQuote,
  buildPreviewRooms,
  buildPreviewTiers,
  type QuotePreviewInput,
} from "@/lib/quotes/preview-data";

type QuotePreviewPaneProps = QuotePreviewInput & {
  companyName: string;
  companyLogoUrl?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  customerName: string;
};

export function QuotePreviewPane(props: QuotePreviewPaneProps) {
  const {
    quoteId,
    companyName,
    companyLogoUrl,
    companyPhone,
    companyEmail,
    customerName,
    tierState,
    lineItems,
    tierPaintConfig = [],
    paintProducts = [],
    ...rest
  } = props;

  const tierPaintSummaries = buildTierPaintSummaries(
    tierPaintConfig,
    paintProducts,
  );

  const quote = buildPreviewQuote({
    quoteId,
    tierState,
    lineItems,
    ...rest,
  });
  const tiers = buildPreviewTiers(quoteId, tierState);
  const optionalItems = buildPreviewOptionalItems(quoteId, lineItems);
  const previewRooms = buildPreviewRooms(quoteId, rest.rooms);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-primary/20">
      <CardHeader className="shrink-0 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Customer preview</CardTitle>
        </div>
        <CardDescription>
          Live view of what your customer sees on the portal. Only priced
          packages are shown — $0 tiers are hidden until you set a price.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
        <div className="scale-[0.92] origin-top p-4 sm:scale-100 sm:p-6">
          <PortalQuoteView
            mode="preview"
            quote={quote}
            tiers={tiers}
            rooms={previewRooms}
            optionalItems={optionalItems}
            tierPaintSummaries={tierPaintSummaries}
            companyName={companyName}
            companyLogoUrl={companyLogoUrl}
            companyPhone={companyPhone}
            companyEmail={companyEmail}
            customerName={customerName}
          />
        </div>
      </CardContent>
    </Card>
  );
}
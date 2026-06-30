"use client";

import { ScopeSummary } from "@/components/quotes/ScopeSummary";
import { QuotePreviewPane } from "@/components/quotes/QuotePreviewPane";
import { TierPricingSection } from "@/components/quotes/TierPricingSection";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TierInput } from "@/app/app/(portal)/quotes/actions";
import type {
  LineItemInput,
  RoomInput,
  TierPaintConfigInput,
} from "@/app/app/(portal)/quotes/actions";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import type { JobAddressFields } from "@/lib/address";
import type {
  Company,
  QuoteEstimationMode,
  QuoteJobType,
  QuoteStatus,
  QuoteTierName,
} from "@/types/database";

type PolishStepProps = {
  quoteId: string;
  company: Company;
  quoteName: string;
  customerName?: string;
  customerId: string;
  jobType: QuoteJobType;
  estimationMode?: QuoteEstimationMode;
  customMessage: string;
  onCustomMessageChange: (value: string) => void;
  jobAddress: JobAddressFields;
  beforePhotos: string[];
  status: QuoteStatus;
  rooms: RoomInput[];
  lineItems: LineItemInput[];
  subtotal: number;
  tierState: Record<QuoteTierName, TierInput>;
  tierBase: number;
  autoTierPrices: Record<QuoteTierName, { price: number; margin: number }>;
  onTierChange: (tier: QuoteTierName, patch: Partial<TierInput>) => void;
  onApplyAutoPricing: () => void;
  parseLines: (value: string) => string[];
  joinLines: (values: string[]) => string;
  tierPaintConfig?: TierPaintConfigInput[];
  paintProducts?: CompanyPaintProductRow[];
};

export function PolishStep({
  quoteId,
  company,
  quoteName,
  customerName,
  customerId,
  jobType,
  estimationMode = "hybrid",
  customMessage,
  onCustomMessageChange,
  jobAddress,
  beforePhotos,
  status,
  rooms,
  lineItems,
  subtotal,
  tierState,
  tierBase,
  autoTierPrices,
  onTierChange,
  onApplyAutoPricing,
  parseLines,
  joinLines,
  tierPaintConfig = [],
  paintProducts = [],
}: PolishStepProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-4">
        <ScopeSummary
          quoteName={quoteName}
          customerName={customerName}
          jobAddress={jobAddress}
          rooms={rooms}
          lineItems={lineItems}
          subtotal={subtotal}
        />

        <div className="space-y-2">
          <Label htmlFor="polish-custom-message">Message to customer</Label>
          <Textarea
            id="polish-custom-message"
            rows={3}
            value={customMessage}
            onChange={(e) => onCustomMessageChange(e.target.value)}
            placeholder="A personal note shown at the top of the proposal…"
          />
        </div>

        <TierPricingSection
          tierState={tierState}
          tierBase={tierBase}
          autoTierPrices={autoTierPrices}
          onTierChange={onTierChange}
          onApplyAutoPricing={onApplyAutoPricing}
          parseLines={parseLines}
          joinLines={joinLines}
        />
      </div>

      <div className="min-h-[480px] xl:sticky xl:top-24 xl:self-start">
        <QuotePreviewPane
          quoteId={quoteId || "preview"}
          companyId={company.id}
          customerId={customerId}
          quoteName={quoteName || null}
          jobType={jobType}
          customMessage={customMessage || null}
          jobAddress={jobAddress}
          beforePhotos={beforePhotos}
          status={status}
          tierState={tierState}
          lineItems={lineItems}
          rooms={rooms}
          estimationMode={estimationMode}
          companyName={company.name}
          companyLogoUrl={company.logo_url}
          companyPhone={company.phone}
          companyEmail={company.email}
          customerName={customerName ?? "Customer"}
          tierPaintConfig={tierPaintConfig}
          paintProducts={paintProducts}
        />
      </div>
    </div>
  );
}
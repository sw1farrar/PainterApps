"use client";

import { CopyPlus, Download, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PostSendNextSteps } from "@/components/quotes/PostSendNextSteps";
import { formatCurrency } from "@/lib/utils";
import { QUOTE_PAINT_TIERS } from "@/lib/paint-library/types";
import { TIER_LABELS } from "../hooks/useQuoteBuilder";
import type { TierInput } from "@/app/app/(portal)/quotes/actions";
import type { QuoteStatus } from "@/types/database";

type QuoteTotals = {
  subtotal: number;
  overhead: number;
  tax: number;
  total: number;
};

type SendStepProps = {
  quoteTotals: QuoteTotals;
  tierState: Record<string, TierInput>;
  quoteId?: string;
  portalUrl: string | null;
  status: QuoteStatus;
  customerName?: string;
  mode: "create" | "edit";
  isPending: boolean;
  onSend: () => void;
  onCopyPortalLink: () => void;
  onDuplicate: () => void;
  onReviseToDraft?: () => void;
  onResend?: () => void;
  onSaveAsTemplate: () => void;
  onOpenPreview?: () => void;
  jobId?: string | null;
};

export function SendStep({
  quoteTotals,
  tierState,
  quoteId,
  portalUrl,
  status,
  customerName,
  mode,
  isPending,
  onSend,
  onCopyPortalLink,
  onDuplicate,
  onReviseToDraft,
  onResend,
  onSaveAsTemplate,
  onOpenPreview,
  jobId,
}: SendStepProps) {
  const isDraft = status === "draft";

  return (
    <div className="space-y-4">
      {!isDraft ? (
        <PostSendNextSteps
          status={status}
          quoteId={quoteId}
          portalUrl={portalUrl}
          customerName={customerName}
          jobId={jobId}
          onCopyPortalLink={onCopyPortalLink}
          onDuplicate={onDuplicate}
          onReviseToDraft={onReviseToDraft}
          onResend={onResend}
          onSaveAsTemplate={onSaveAsTemplate}
          onOpenPreview={onOpenPreview}
          isPending={isPending}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{isDraft ? "Send proposal" : "Proposal summary"}</CardTitle>
          <CardDescription>
            {isDraft
              ? "Review totals, then email your customer or download a PDF."
              : "Totals and tier pricing for this quote."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Direct costs</p>
              <p className="font-semibold text-foreground">
                {formatCurrency(quoteTotals.subtotal)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Overhead</p>
              <p className="font-semibold text-foreground">
                {formatCurrency(quoteTotals.overhead)}
              </p>
            </div>
            {quoteTotals.tax > 0 ? (
              <div>
                <p className="text-muted-foreground">Tax</p>
                <p className="font-semibold text-foreground">
                  {formatCurrency(quoteTotals.tax)}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-muted-foreground">All-in total</p>
              <p className="font-semibold text-foreground">
                {formatCurrency(quoteTotals.total)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUOTE_PAINT_TIERS.map((tier) => (
              <div
                key={tier}
                className="rounded-lg border border-border bg-muted/30 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {TIER_LABELS[tier]}
                </p>
                <p className="type-stat-value mt-1 text-2xl">
                  {formatCurrency(tierState[tier].price)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tierState[tier].margin}% margin
                </p>
              </div>
            ))}
          </div>

          {isDraft ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {quoteId ? (
                <Button variant="outline" asChild>
                  <a
                    href={`/api/quotes/${quoteId}/marketing-sheet`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </a>
                </Button>
              ) : null}
              {quoteId && mode === "edit" ? (
                <Button
                  variant="outline"
                  onClick={onDuplicate}
                  disabled={isPending}
                >
                  <CopyPlus className="h-4 w-4" />
                  Duplicate quote
                </Button>
              ) : null}
              <Button onClick={onSend} disabled={isPending} size="lg">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send quote
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
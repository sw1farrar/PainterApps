"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Loader2, Mail, Phone } from "lucide-react";
import { acceptQuote, declineQuote } from "@/app/app/(portal)/quotes/actions";
import { lineItemTotal } from "@/lib/quotes/area-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatJobAddress } from "@/lib/address";
import { formatPhoneDisplay } from "@/lib/phone";
import { isQuotePaintTier, type TierPaintSummary } from "@/lib/paint-library/types";
import { formatQuoteTierLabel } from "@/lib/quotes/tier-labels";
import { formatCurrency, isAbsoluteHttpUrl } from "@/lib/utils";
import type {
  Quote,
  QuoteLineItem,
  QuoteRoom,
  QuoteTier,
  QuoteTierName,
} from "@/types/database";

type PortalQuoteViewProps = {
  mode?: "portal" | "preview";
  quote: Quote;
  tiers: QuoteTier[];
  rooms?: QuoteRoom[];
  optionalItems?: QuoteLineItem[];
  tierPaintSummaries?: TierPaintSummary[];
  companyName: string;
  companyLogoUrl?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  customerName: string;
  portalToken?: string;
};

export function PortalQuoteView({
  mode = "portal",
  quote,
  tiers,
  rooms = [],
  optionalItems = [],
  tierPaintSummaries = [],
  companyName,
  companyLogoUrl,
  companyPhone,
  companyEmail,
  customerName,
  portalToken,
}: PortalQuoteViewProps) {
  const isPreview = mode === "preview";
  const [selectedTier, setSelectedTier] = useState<QuoteTierName | null>(() =>
    quote.status === "accepted" && quote.accepted_tier
      ? quote.accepted_tier
      : null,
  );
  const [enabledOptions, setEnabledOptions] = useState<Set<string>>(() => {
    if (isPreview) return new Set(optionalItems.map((item) => item.id));
    if (quote.status === "accepted" && quote.accepted_optional_line_item_ids) {
      return new Set(quote.accepted_optional_line_item_ids);
    }
    return new Set();
  });
  const [declineOpen, setDeclineOpen] = useState(false);
  const [accepted, setAccepted] = useState(quote.status === "accepted");
  const [declined, setDeclined] = useState(quote.status === "declined");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isPreview) {
      setEnabledOptions(new Set(optionalItems.map((item) => item.id)));
    }
  }, [optionalItems, isPreview]);

  const isSent = quote.status === "sent";
  const isUnavailable =
    !isPreview && quote.status !== "sent" && quote.status !== "accepted";

  const paintByTier = useMemo(
    () => new Map(tierPaintSummaries.map((row) => [row.tier, row])),
    [tierPaintSummaries],
  );

  const sortedTiers = [...tiers]
    .filter(
      (tier) =>
        isQuotePaintTier(tier.tier) && (isPreview || tier.price > 0),
    )
    .sort((a, b) => a.price - b.price);
  const logoUrl = isAbsoluteHttpUrl(companyLogoUrl) ? companyLogoUrl : null;
  const beforePhotos = (quote.before_photos ?? []).filter(isAbsoluteHttpUrl);

  const optionsTotal = useMemo(() => {
    return optionalItems.reduce((sum, item) => {
      if (!enabledOptions.has(item.id)) return sum;
      return sum + lineItemTotal(item);
    }, 0);
  }, [optionalItems, enabledOptions]);

  const toggleOption = (id: string) => {
    setEnabledOptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAccept = () => {
    if (!selectedTier || !portalToken || isPreview) return;

    startTransition(async () => {
      setError(null);
      const result = await acceptQuote(
        quote.id,
        selectedTier,
        portalToken,
        [...enabledOptions],
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAccepted(true);
    });
  };

  const handleDecline = () => {
    if (!portalToken || isPreview) return;
    setDeclineOpen(true);
  };

  const confirmDecline = () => {
    if (!portalToken || isPreview) return;

    startTransition(async () => {
      setError(null);
      const result = await declineQuote(quote.id, portalToken);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDeclined(true);
      setDeclineOpen(false);
    });
  };

  const selectedTierData = selectedTier
    ? tiers.find((t) => t.tier === selectedTier)
    : null;
  const displayTotal =
    (selectedTierData?.price ?? 0) + (selectedTier ? optionsTotal : 0);

  return (
    <div className="space-y-8">
      {isPreview ? (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-center text-xs text-muted-foreground">
          Preview mode — customer actions disabled
        </div>
      ) : null}

      <header className="space-y-4 text-center">
        {logoUrl ? (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={companyName}
              className="h-16 w-auto max-w-[200px] object-contain"
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <p className="type-eyebrow">{companyName}</p>
          <h1 className="font-display text-3xl text-white sm:text-4xl">
            Your Painting Quote
          </h1>
          <p className="text-muted-foreground">
            Hi {customerName} — review your options for{" "}
            {formatJobAddress(quote)}
          </p>
          {quote.custom_message?.trim() ? (
            <p className="mx-auto max-w-lg rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
              {quote.custom_message}
            </p>
          ) : null}
          {(companyPhone || companyEmail) && (
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              {companyPhone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhoneDisplay(companyPhone)}
                </span>
              ) : null}
              {companyEmail ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {companyEmail}
                </span>
              ) : null}
            </div>
          )}
        </div>
        {accepted ? (
          <Badge className="mt-2">
            {quote.accepted_tier
              ? `Accepted: ${formatQuoteTierLabel(quote.accepted_tier)}`
              : "Quote Accepted"}
          </Badge>
        ) : null}
        {declined ? (
          <Badge variant="destructive" className="mt-2">
            Quote Declined
          </Badge>
        ) : null}
      </header>

      {rooms.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project scope</CardTitle>
            <CardDescription>
              Areas included in this estimate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {rooms.map((room) => (
                <li
                  key={room.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm"
                >
                  <span className="font-medium text-foreground">{room.name}</span>
                  <span className="text-muted-foreground">
                    {room.sq_ft > 0 ? `${room.sq_ft} sq ft` : null}
                    {room.is_optional ? (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Optional
                      </Badge>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {beforePhotos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project photos</CardTitle>
            <CardDescription>
              Reference images from your property.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {beforePhotos.map((photo) => (
                <div
                  key={photo}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt="Project reference"
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {sortedTiers.length === 0 && !isPreview ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="py-8 text-center">
            <p className="font-semibold text-foreground">
              No packages available
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This quote does not have any priced packages yet. Contact{" "}
              {companyName} for an updated proposal.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedTiers.map((tier) => {
          const isSelected = selectedTier === tier.tier;
          const isAcceptedTier = quote.accepted_tier === tier.tier;
          const paintSummary = isQuotePaintTier(tier.tier)
            ? paintByTier.get(tier.tier)
            : undefined;

          return (
            <button
              key={tier.id}
              type="button"
              disabled={accepted || declined || isPreview || !isSent}
              aria-label={`${formatQuoteTierLabel(tier.tier)} package — ${formatCurrency(tier.price)}`}
              aria-pressed={isSelected || isAcceptedTier}
              onClick={() => setSelectedTier(tier.tier)}
              className={`text-left transition-all ${
                isSelected || isAcceptedTier
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : ""
              }`}
            >
              <Card
                className={`h-full ${
                  isSelected ? "border-primary bg-primary/5" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="capitalize">
                    {formatQuoteTierLabel(tier.tier)}
                  </CardTitle>
                  <CardDescription>
                    <span className="type-stat-value text-2xl text-white">
                      {formatCurrency(tier.price)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {paintSummary?.topcoatName ? (
                    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Paint system
                      </p>
                      {paintSummary.primerName ? (
                        <p className="mt-1 text-foreground">
                          Primer: {paintSummary.primerName}
                          {paintSummary.primerCoats > 1
                            ? ` (${paintSummary.primerCoats} coats)`
                            : null}
                        </p>
                      ) : null}
                      <p className="text-foreground">
                        Topcoat: {paintSummary.topcoatName}
                        {paintSummary.topcoatCoats > 1
                          ? ` (${paintSummary.topcoatCoats} coats)`
                          : null}
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Features
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {(tier.features ?? []).map((feature, i) => (
                        <li key={i}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Benefits
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {(tier.benefits ?? []).map((benefit, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {optionalItems.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Optional add-ons</CardTitle>
            <CardDescription>
              Toggle extras to include in your package total.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {optionalItems.map((item) => {
              const enabled = enabledOptions.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={accepted || declined || !isSent}
                  aria-pressed={enabled}
                  onClick={() => toggleOption(item.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    enabled
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.type}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold">
                      +{formatCurrency(lineItemTotal(item))}
                    </span>
                    {enabled ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : null}
                  </div>
                </button>
              );
            })}
            {selectedTier && optionsTotal > 0 ? (
              <p className="text-sm text-muted-foreground">
                Selected add-ons: +{formatCurrency(optionsTotal)} · Estimated
                total:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(displayTotal)}
                </span>
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isUnavailable ? (
        <Card className="mx-auto max-w-lg border-border bg-muted/20">
          <CardContent className="py-8 text-center">
            <p className="font-semibold text-foreground">
              {quote.status === "draft"
                ? "This quote is not ready yet"
                : "This quote is no longer active"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {quote.status === "draft"
                ? `${companyName} is still preparing your proposal. You'll receive a link when it's ready to review.`
                : `${companyName} will reach out if a revised proposal is available.`}
            </p>
          </CardContent>
        </Card>
      ) : !isPreview && isSent && !accepted && !declined ? (
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="w-full max-w-sm"
            disabled={!selectedTier || isPending}
            onClick={handleAccept}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Accept Selected Package
          </Button>
          {!selectedTier ? (
            <p className="text-sm text-muted-foreground">
              Select a package above to continue
            </p>
          ) : optionsTotal > 0 ? (
            <p className="text-sm text-muted-foreground">
              Total with add-ons: {formatCurrency(displayTotal)}
            </p>
          ) : null}
          <Button
            variant="ghost"
            className="text-muted-foreground"
            disabled={isPending}
            onClick={handleDecline}
          >
            Decline quote
          </Button>
        </div>
      ) : isPreview ? (
        <p className="text-center text-sm text-muted-foreground">
          {selectedTier
            ? `Customer total with selections: ${formatCurrency(displayTotal)}`
            : "Select a tier in preview to simulate the customer total"}
        </p>
      ) : accepted ? (
        <Card className="mx-auto max-w-lg border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center">
            <Check className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-4 font-semibold text-foreground">
              Thank you! Your selection has been submitted.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {companyName} will be in touch to schedule your project.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto max-w-lg border-destructive/30 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="font-semibold text-foreground">Quote declined</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {companyName} has been notified. Reach out anytime if you&apos;d
              like a revised proposal.
            </p>
          </CardContent>
        </Card>
      )}

      {error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this quote?</DialogTitle>
            <DialogDescription>
              {companyName} will be notified. You can contact them anytime if
              you&apos;d like a revised proposal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeclineOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDecline}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Decline quote"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
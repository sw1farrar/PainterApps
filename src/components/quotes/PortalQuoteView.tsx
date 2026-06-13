"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Mail, Phone } from "lucide-react";
import { acceptQuote, declineQuote } from "@/app/app/(portal)/quotes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatJobAddress } from "@/lib/address";
import { formatCurrency, isAbsoluteHttpUrl } from "@/lib/utils";
import type { Quote, QuoteTier, QuoteTierName } from "@/types/database";

const TIER_LABELS: Record<QuoteTierName, string> = {
  good: "Good",
  better: "Better",
  best: "Best",
  beautiful: "Beautiful",
};

type PortalQuoteViewProps = {
  quote: Quote;
  tiers: QuoteTier[];
  companyName: string;
  companyLogoUrl?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  customerName: string;
  portalToken: string;
};

export function PortalQuoteView({
  quote,
  tiers,
  companyName,
  companyLogoUrl,
  companyPhone,
  companyEmail,
  customerName,
  portalToken,
}: PortalQuoteViewProps) {
  const [selectedTier, setSelectedTier] = useState<QuoteTierName | null>(null);
  const [accepted, setAccepted] = useState(quote.status === "accepted");
  const [declined, setDeclined] = useState(quote.status === "declined");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedTiers = [...tiers].sort((a, b) => a.price - b.price);
  const logoUrl = isAbsoluteHttpUrl(companyLogoUrl) ? companyLogoUrl : null;
  const beforePhotos = (quote.before_photos ?? []).filter(isAbsoluteHttpUrl);

  const handleAccept = () => {
    if (!selectedTier) return;

    startTransition(async () => {
      setError(null);
      const result = await acceptQuote(quote.id, selectedTier, portalToken);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAccepted(true);
    });
  };

  const handleDecline = () => {
    if (!confirm("Decline this quote? You can contact the company if you change your mind.")) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await declineQuote(quote.id, portalToken);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDeclined(true);
    });
  };

  return (
    <div className="space-y-8">
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
          {(companyPhone || companyEmail) && (
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              {companyPhone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {companyPhone}
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
              ? `Accepted: ${TIER_LABELS[quote.accepted_tier]}`
              : "Quote Accepted"}
          </Badge>
        ) : null}
        {declined ? (
          <Badge variant="destructive" className="mt-2">
            Quote Declined
          </Badge>
        ) : null}
      </header>

      {beforePhotos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project photos</CardTitle>
            <CardDescription>Reference images from your property.</CardDescription>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sortedTiers.map((tier) => {
          const isSelected = selectedTier === tier.tier;
          const isAcceptedTier = quote.accepted_tier === tier.tier;

          return (
            <button
              key={tier.id}
              type="button"
              disabled={accepted || declined}
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
                    {TIER_LABELS[tier.tier]}
                  </CardTitle>
                  <CardDescription>
                    <span className="type-stat-value text-2xl text-white">
                      {formatCurrency(tier.price)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
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

      {!accepted && !declined ? (
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
        <p className="text-center text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
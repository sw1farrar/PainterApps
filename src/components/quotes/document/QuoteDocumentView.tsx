"use client";

import {
  Building2,
  MapPin,
  MessageSquare,
  Package,
  Paintbrush,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";
import { formatJobAddress } from "@/lib/address";
import { formatPhoneDisplay } from "@/lib/phone";
import { isQuotePaintTier, type TierPaintSummary } from "@/lib/paint-library/types";
import { formatQuoteTierLabel } from "@/lib/quotes/tier-labels";
import { formatCurrency, isAbsoluteHttpUrl } from "@/lib/utils";
import { QuoteDocumentHotspot } from "@/components/quotes/document/QuoteDocumentHotspot";
import type { Quote, QuoteRoom, QuoteTier, QuoteTierName } from "@/types/database";

type QuoteDocumentViewProps = {
  quote: Quote;
  tiers: QuoteTier[];
  rooms: QuoteRoom[];
  tierPaintSummaries?: TierPaintSummary[];
  companyName: string;
  companyLogoUrl?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  customerName?: string;
  editable?: boolean;
  onEditCustomer?: () => void;
  onEditSite?: () => void;
  onEditAreas?: () => void;
  onEditPaint?: () => void;
  onEditPackages?: () => void;
  onEditMessage?: () => void;
  onAddArea?: () => void;
};

const TIER_ACCENT: Record<string, string> = {
  good: "border-slate-200 bg-slate-50",
  better: "border-blue-200 bg-blue-50/60 ring-1 ring-blue-100",
  best: "border-amber-200 bg-amber-50/50 ring-1 ring-amber-100",
};

export function QuoteDocumentView({
  quote,
  tiers,
  rooms,
  tierPaintSummaries = [],
  companyName,
  companyLogoUrl,
  companyPhone,
  companyEmail,
  customerName,
  editable = false,
  onEditCustomer,
  onEditSite,
  onEditAreas,
  onEditPaint,
  onEditPackages,
  onEditMessage,
  onAddArea,
}: QuoteDocumentViewProps) {
  const logoUrl = isAbsoluteHttpUrl(companyLogoUrl) ? companyLogoUrl : null;
  const hasCustomer = Boolean(customerName?.trim());
  const hasAddress = Boolean(formatJobAddress(quote).trim());
  const paintByTier = new Map(tierPaintSummaries.map((row) => [row.tier, row]));

  const sortedTiers = [...tiers]
    .filter((tier) => isQuotePaintTier(tier.tier) && tier.price > 0)
    .sort((a, b) => a.price - b.price);

  const showPlaceholderTiers =
    sortedTiers.length === 0 &&
    editable &&
    tiers.some((t) => isQuotePaintTier(t.tier));

  const displayTiers =
    sortedTiers.length > 0
      ? sortedTiers
      : showPlaceholderTiers
        ? tiers.filter((t) => isQuotePaintTier(t.tier))
        : [];

  return (
    <article className="min-h-full bg-white px-8 py-10 text-slate-900 sm:px-10 sm:py-12">
      <header className="border-b border-slate-200 pb-8 text-center">
        {logoUrl ? (
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={companyName}
              className="h-14 w-auto max-w-[220px] object-contain"
            />
          </div>
        ) : (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
            {companyName}
          </p>
        )}

        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2rem]">
          Painting Proposal
        </h1>

        <div className="mt-4 space-y-2">
          {hasCustomer ? (
            <p className="text-base text-slate-600">
              Prepared for{" "}
              <span className="font-semibold text-slate-900">{customerName}</span>
            </p>
          ) : editable ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-slate-500">Add who this is for</span>
              <QuoteDocumentHotspot
                icon={UserRound}
                label="Set customer"
                onClick={() => onEditCustomer?.()}
                variant="primary"
              />
            </div>
          ) : null}

          {hasAddress ? (
            <p className="inline-flex items-center justify-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {formatJobAddress(quote)}
            </p>
          ) : editable ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <QuoteDocumentHotspot
                icon={Building2}
                label="Add job site"
                onClick={() => onEditSite?.()}
              />
            </div>
          ) : null}
        </div>

        {(companyPhone || companyEmail) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            {companyPhone ? (
              <span>{formatPhoneDisplay(companyPhone)}</span>
            ) : null}
            {companyEmail ? <span>{companyEmail}</span> : null}
          </div>
        )}

        {editable ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <QuoteDocumentHotspot
              icon={UserRound}
              label="Customer"
              onClick={() => onEditCustomer?.()}
            />
            <QuoteDocumentHotspot
              icon={MapPin}
              label="Job site"
              onClick={() => onEditSite?.()}
            />
          </div>
        ) : null}
      </header>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-blue-800">
            Project scope
          </h2>
          {editable ? (
            <div className="flex gap-2">
              <QuoteDocumentHotspot
                icon={Plus}
                label="Add area"
                onClick={() => onAddArea?.()}
                variant="primary"
              />
              <QuoteDocumentHotspot
                icon={Paintbrush}
                label="Edit areas"
                onClick={() => onEditAreas?.()}
              />
            </div>
          ) : null}
        </div>

        {rooms.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm"
              >
                <span className="font-medium text-slate-800">{room.name}</span>
                <span className="text-slate-500">
                  {room.sq_ft > 0 ? `${room.sq_ft} sq ft` : "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : editable ? (
          <button
            type="button"
            onClick={() => onAddArea?.()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center transition hover:border-blue-300 hover:bg-blue-50/30"
          >
            <Plus className="h-6 w-6 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">
              Add your first area
            </span>
            <span className="text-xs text-slate-500">
              Living room, exterior siding, cabinets — anything you&apos;re painting
            </span>
          </button>
        ) : (
          <p className="text-sm text-slate-500">Scope details coming soon.</p>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-blue-800">
            Your options
          </h2>
          {editable ? (
            <div className="flex flex-wrap gap-2">
              <QuoteDocumentHotspot
                icon={Paintbrush}
                label="Paint systems"
                onClick={() => onEditPaint?.()}
              />
              <QuoteDocumentHotspot
                icon={Package}
                label="Packages & pricing"
                onClick={() => onEditPackages?.()}
              />
            </div>
          ) : null}
        </div>

        {displayTiers.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {displayTiers.map((tier) => {
              const paintSummary = isQuotePaintTier(tier.tier)
                ? paintByTier.get(tier.tier)
                : undefined;
              const isPlaceholder = tier.price <= 0;

              return (
                <div
                  key={tier.id}
                  className={`flex h-full flex-col rounded-xl border p-5 ${TIER_ACCENT[tier.tier] ?? "border-slate-200 bg-white"}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {formatQuoteTierLabel(tier.tier)}
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold text-slate-900">
                    {isPlaceholder ? "—" : formatCurrency(tier.price)}
                  </p>
                  {paintSummary?.topcoatName ? (
                    <p className="mt-2 text-xs text-slate-600">
                      {paintSummary.topcoatName}
                      {paintSummary.primerName
                        ? ` · ${paintSummary.primerName}`
                        : ""}
                    </p>
                  ) : null}
                  {tier.features.length > 0 ? (
                    <ul className="mt-4 flex-1 space-y-1.5 text-xs text-slate-600">
                      {tier.features.slice(0, 4).map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : isPlaceholder && editable ? (
                    <p className="mt-4 text-xs text-slate-500">
                      Set pricing in the wizard
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : editable ? (
          <button
            type="button"
            onClick={() => onEditPackages?.()}
            className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center transition hover:border-blue-300"
          >
            <Package className="mx-auto h-6 w-6 text-blue-600" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Build Good · Better · Best packages
            </p>
          </button>
        ) : null}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-blue-800">
            A note from us
          </h2>
          {editable ? (
            <QuoteDocumentHotspot
              icon={MessageSquare}
              label="Edit message"
              onClick={() => onEditMessage?.()}
            />
          ) : null}
        </div>
        {quote.custom_message?.trim() ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
            {quote.custom_message}
          </p>
        ) : editable ? (
          <button
            type="button"
            onClick={() => onEditMessage?.()}
            className="w-full rounded-lg border border-dashed border-slate-200 px-4 py-3 text-left text-sm text-slate-500 transition hover:border-blue-300 hover:text-slate-700"
          >
            Add a personal message your customer will see here…
          </button>
        ) : null}
      </section>

      <footer className="mt-10 border-t border-slate-100 pt-6 text-center text-[10px] uppercase tracking-widest text-slate-400">
        {companyName} · Professional painting services
      </footer>
    </article>
  );
}
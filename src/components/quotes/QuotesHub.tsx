"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteQuote } from "@/app/app/(portal)/quotes/actions";
import { DeleteQuoteDialog } from "@/components/quotes/DeleteQuoteDialog";
import { QuoteEstimateDefaultsButton } from "@/components/quotes/QuoteEstimateDefaultsModal";
import { formatJobAddress, type JobAddressFields } from "@/lib/address";
import {
  quoteCardSubtitle,
  quoteCardTitle,
} from "@/lib/quotes/quote-list-summary";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { QuoteStatus } from "@/types/database";

const STATUS_VARIANT: Record<
  QuoteStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  sent: "default",
  accepted: "outline",
  declined: "destructive",
};

export type QuoteListCard = JobAddressFields & {
  id: string;
  name: string | null;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  customers: { name: string } | null;
  quote_tiers: { price: number; tier: string }[] | null;
  areaSummary: string;
  productSummary: string;
  hasLinkedJob: boolean;
};

type QuotesHubProps = {
  quotes: QuoteListCard[];
};

export function QuotesHub({ quotes: initialQuotes }: QuotesHubProps) {
  const router = useRouter();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [quoteToDelete, setQuoteToDelete] = useState<QuoteListCard | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQuotes(initialQuotes);
  }, [initialQuotes]);

  const confirmDelete = () => {
    if (!quoteToDelete) return;

    startTransition(async () => {
      const result = await deleteQuote(quoteToDelete.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setQuotes((current) =>
        current.filter((quote) => quote.id !== quoteToDelete.id),
      );
      toast.success("Estimate deleted");
      setQuoteToDelete(null);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="type-eyebrow">Estimates</p>
          <h1 className="font-display mt-2 text-3xl text-white sm:text-4xl">
            Your Estimates
          </h1>
          <p className="type-lead mt-2 text-sm sm:text-base">
            Build quotes quickly and send them to customers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuoteEstimateDefaultsButton />
          <Button asChild>
            <Link href="/app/quotes/new">
              <Plus className="h-4 w-4" />
              New Estimate
            </Link>
          </Button>
        </div>
      </div>

      {!quotes.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No estimates yet</CardTitle>
            <CardDescription>
              Create your first estimate in a few simple steps.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/quotes/new">Create estimate</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => {
            const customerName = quote.customers?.name ?? null;
            const title = quoteCardTitle({
              name: quote.name,
              customerName,
            });
            const subtitle = quoteCardSubtitle({
              name: quote.name,
              customerName,
            });
            const tiers = quote.quote_tiers ?? [];
            const quotePrice =
              tiers.find((tier) => tier.tier === "good")?.price ??
              tiers.find((tier) => tier.price > 0)?.price ??
              0;
            const address = formatJobAddress(quote);

            return (
              <Card
                key={quote.id}
                className="overflow-hidden transition-colors hover:border-primary/40"
              >
                <CardContent className="flex gap-2 p-0 sm:gap-0">
                  <Link
                    href={`/app/quotes/${quote.id}`}
                    className="min-w-0 flex-1 p-5 text-left"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-foreground sm:text-lg">
                            {title}
                          </p>
                          <Badge
                            variant={STATUS_VARIANT[quote.status]}
                            className="capitalize"
                          >
                            {quote.status}
                          </Badge>
                        </div>

                        {subtitle ? (
                          <p className="text-sm text-muted-foreground">
                            {subtitle}
                          </p>
                        ) : null}

                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                          <div className="min-w-0">
                            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Areas
                            </dt>
                            <dd className="mt-0.5 text-foreground">
                              {quote.areaSummary}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Products
                            </dt>
                            <dd className="mt-0.5 text-foreground">
                              {quote.productSummary}
                            </dd>
                          </div>
                        </dl>

                        {address ? (
                          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{address}</span>
                          </p>
                        ) : null}

                        <p className="text-xs text-muted-foreground">
                          Updated{" "}
                          {format(new Date(quote.updated_at), "MMM d, yyyy")}
                        </p>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        {quotePrice > 0 ? (
                          <p className="text-lg font-semibold text-foreground">
                            {formatCurrency(quotePrice)}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No pricing yet
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="flex shrink-0 flex-col border-l border-border/60 p-2 sm:p-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${title}`}
                      disabled={isPending}
                      onClick={() => setQuoteToDelete(quote)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DeleteQuoteDialog
        open={quoteToDelete != null}
        title={
          quoteToDelete
            ? quoteCardTitle({
                name: quoteToDelete.name,
                customerName: quoteToDelete.customers?.name ?? null,
              })
            : ""
        }
        customerName={quoteToDelete?.customers?.name ?? null}
        areaSummary={quoteToDelete?.areaSummary ?? ""}
        productSummary={quoteToDelete?.productSummary ?? ""}
        status={quoteToDelete?.status ?? "draft"}
        hasLinkedJob={quoteToDelete?.hasLinkedJob ?? false}
        isPending={isPending}
        onOpenChange={(open) => {
          if (!open && !isPending) setQuoteToDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { formatJobAddress, type JobAddressFields } from "@/lib/address";
import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
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

export default async function QuotesPage() {
  const { company } = await requireOnboarded();
  const supabase = await createClient();

  const { data: quotes } = await supabase
    .from("quotes")
    .select(
      "id, job_address, job_address_line2, job_city, job_state, job_zip, status, created_at, updated_at, customers(name), quote_tiers(price, tier)",
    )
    .eq("company_id", company!.id)
    .order("updated_at", { ascending: false });

  type QuoteListRow = JobAddressFields & {
    id: string;
    status: QuoteStatus;
    created_at: string;
    updated_at: string;
    customers: { name: string } | null;
    quote_tiers: { price: number; tier: string }[] | null;
  };

  const quoteRows = (quotes ?? []) as unknown as QuoteListRow[];

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="type-eyebrow">Quotes</p>
            <h1 className="font-display mt-2 text-3xl text-white sm:text-4xl">
              Your Quotes
            </h1>
            <p className="type-lead mt-2 text-sm sm:text-base">
              Create good-better-best proposals and win more jobs.
            </p>
          </div>
          <Button asChild>
            <Link href="/app/quotes/new">
              <Plus className="h-4 w-4" />
              New Quote
            </Link>
          </Button>
        </div>

        {!quoteRows.length ? (
          <Card>
            <CardHeader>
              <CardTitle>No quotes yet</CardTitle>
              <CardDescription>
                Build your first tiered proposal in minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/app/quotes/new">Create Quote</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {quoteRows.map((quote) => {
              const customer = quote.customers;
              const tiers = quote.quote_tiers ?? [];
              const lowPrice = tiers.length
                ? Math.min(...tiers.map((t) => t.price))
                : 0;
              const highPrice = tiers.length
                ? Math.max(...tiers.map((t) => t.price))
                : 0;

              return (
                <Link key={quote.id} href={`/app/quotes/${quote.id}`}>
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">
                            {customer?.name ?? "Unknown customer"}
                          </p>
                          <Badge
                            variant={STATUS_VARIANT[quote.status as QuoteStatus]}
                            className="capitalize"
                          >
                            {quote.status}
                          </Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {formatJobAddress(quote)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated{" "}
                          {format(new Date(quote.updated_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {tiers.length > 0 ? (
                          <p className="font-semibold text-foreground">
                            {formatCurrency(lowPrice)} –{" "}
                            {formatCurrency(highPrice)}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Draft</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
    </div>
  );
}
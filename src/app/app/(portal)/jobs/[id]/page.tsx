import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mail, MapPin, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatAddress, formatJobAddress } from "@/lib/address";
import { formatPhoneDisplay } from "@/lib/phone";
import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { formatQuoteTierLabel } from "@/lib/quotes/tier-labels";
import type { Customer, Quote, QuoteTierName } from "@/types/database";
import { JobPhotosPanel } from "./JobPhotosPanel";
import { JobStatusPanel } from "./JobStatusPanel";
import { JobWorkPanel } from "./JobWorkPanel";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { company } = await requireOnboarded();
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, customers(*), quotes(*)")
    .eq("id", id)
    .eq("company_id", company!.id)
    .single();

  if (!job) notFound();

  type JobDetailRow = {
    id: string;
    status: string;
    tier: QuoteTierName;
    selling_price: number;
    job_photos: string[];
    notes: string | null;
    checklist: { id: string; label: string; done: boolean }[];
    created_at: string;
    customers: Customer | null;
    quotes: Quote | null;
  };

  const jobRow = job as unknown as JobDetailRow;
  const customer = jobRow.customers;
  const quote = jobRow.quotes;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href="/app/jobs">
              <ArrowLeft className="h-4 w-4" />
              Back to jobs
            </Link>
          </Button>
          <div>
            <p className="type-eyebrow">Job detail</p>
            <h1 className="font-display mt-1 text-2xl text-white md:text-3xl">
              {customer?.name ?? "Job"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {quote ? formatJobAddress(quote) : "No job address"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="capitalize">
            {jobRow.status}
          </Badge>
          <Badge variant="outline">
            {formatQuoteTierLabel(jobRow.tier)} tier
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border bg-card/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Project summary</CardTitle>
            <CardDescription>
              Accepted on{" "}
              {format(new Date(jobRow.created_at), "MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contract value
              </p>
              <p className="type-stat-value mt-1 text-3xl">
                {formatCurrency(jobRow.selling_price)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Selected tier
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatQuoteTierLabel(jobRow.tier)}
              </p>
            </div>
          </CardContent>
        </Card>

        <JobStatusPanel jobId={jobRow.id} status={jobRow.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {customer?.name ?? "—"}
            </p>
            {customer?.email ? (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                {customer.email}
              </p>
            ) : null}
            {customer?.phone ? (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                {formatPhoneDisplay(customer.phone)}
              </p>
            ) : null}
            {customer && formatAddress(customer) ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                {formatAddress(customer)}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Linked quote</CardTitle>
            <CardDescription>
              View the original proposal and pricing tiers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quote ? (
              <Button variant="outline" asChild>
                <Link href={`/app/quotes/${quote.id}`}>
                  <FileText className="h-4 w-4" />
                  Open quote
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Quote record not found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <JobWorkPanel
        jobId={jobRow.id}
        initialNotes={jobRow.notes ?? ""}
        initialChecklist={jobRow.checklist ?? []}
      />

      <JobPhotosPanel
        jobId={jobRow.id}
        initialPhotos={jobRow.job_photos ?? []}
        beforePhotos={quote?.before_photos ?? []}
      />
    </div>
  );
}
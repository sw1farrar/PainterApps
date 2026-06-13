import Link from "next/link";
import { format } from "date-fns";
import { HardHat } from "lucide-react";

import { PageHeader } from "@/components/portal/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import type { QuoteTierName } from "@/types/database";

const TIER_LABELS: Record<QuoteTierName, string> = {
  good: "Good",
  better: "Better",
  best: "Best",
  beautiful: "Beautiful",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  active: "default",
  completed: "outline",
};

export default async function JobsPage() {
  const { company } = await requireOnboarded();
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, status, tier, selling_price, created_at, customers(name), quotes(job_address)",
    )
    .eq("company_id", company!.id)
    .order("created_at", { ascending: false });

  type JobListRow = {
    id: string;
    status: string;
    tier: QuoteTierName;
    selling_price: number;
    created_at: string;
    customers: { name: string } | null;
    quotes: { job_address: string } | null;
  };

  const jobRows = (jobs ?? []) as unknown as JobListRow[];
  const activeCount = jobRows.filter((job) => job.status !== "completed").length;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Jobs"
        title="Active Jobs"
        description={`${activeCount} in progress · ${jobRows.length} total`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/app/quotes">View quotes</Link>
          </Button>
        }
      />

      {!jobRows.length ? (
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-blue-200">
              <HardHat className="h-7 w-7" />
            </div>
            <CardTitle>No jobs yet</CardTitle>
            <CardDescription>
              Jobs are created automatically when a customer accepts a quote in
              the portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/app/quotes/new">Create a quote</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4">
          {jobRows.map((job) => {
            const customer = job.customers;
            const quote = job.quotes;

            return (
              <Link key={job.id} href={`/app/jobs/${job.id}`}>
                <Card className="border-border bg-card/80 backdrop-blur-sm transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {customer?.name ?? "Unknown customer"}
                        </p>
                        <Badge
                          variant={STATUS_VARIANT[job.status] ?? "secondary"}
                          className="capitalize"
                        >
                          {job.status}
                        </Badge>
                        <Badge variant="secondary">
                          {TIER_LABELS[job.tier]} tier
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {quote?.job_address ?? "No job address"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Started {format(new Date(job.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(job.selling_price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Contract value
                      </p>
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
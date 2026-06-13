import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  HardHat,
  TrendingUp,
  XCircle,
} from "lucide-react";

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
import type { QuoteStatus } from "@/types/database";

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default async function ReportsPage() {
  const { company } = await requireOnboarded();
  const supabase = await createClient();
  const companyId = company!.id;

  const [jobsResult, quotesResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, status, selling_price, created_at")
      .eq("company_id", companyId),
    supabase
      .from("quotes")
      .select("id, status, created_at, updated_at")
      .eq("company_id", companyId),
  ]);

  const jobs = jobsResult.data ?? [];
  const quotes = quotesResult.data ?? [];

  const acceptedQuoteIds = quotes
    .filter((quote) => quote.status === "accepted")
    .map((quote) => quote.id);

  const { data: tiers } =
    acceptedQuoteIds.length > 0
      ? await supabase
          .from("quote_tiers")
          .select("margin, price")
          .in("quote_id", acceptedQuoteIds)
      : { data: [] };

  const totalRevenue = jobs.reduce(
    (sum, job) => sum + (job.selling_price ?? 0),
    0,
  );
  const completedRevenue = jobs
    .filter((job) => job.status === "completed")
    .reduce((sum, job) => sum + (job.selling_price ?? 0), 0);
  const pipelineRevenue = jobs
    .filter((job) => job.status !== "completed")
    .reduce((sum, job) => sum + (job.selling_price ?? 0), 0);

  const quoteCounts: Record<QuoteStatus, number> = {
    draft: 0,
    sent: 0,
    accepted: 0,
    declined: 0,
  };

  for (const quote of quotes) {
    quoteCounts[quote.status as QuoteStatus] += 1;
  }

  const sentOrDecided = quoteCounts.sent + quoteCounts.accepted + quoteCounts.declined;
  const winRate =
    sentOrDecided > 0 ? (quoteCounts.accepted / sentOrDecided) * 100 : 0;

  const acceptedMargins = (tiers ?? []).map((tier) => tier.margin ?? 0);

  const avgMargin =
    acceptedMargins.length > 0
      ? acceptedMargins.reduce((sum, margin) => sum + margin, 0) /
        acceptedMargins.length
      : 0;

  const avgJobValue = jobs.length > 0 ? totalRevenue / jobs.length : 0;

  const recentJobs = [...jobs]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  const stats = [
    {
      label: "Total revenue",
      value: formatCurrency(totalRevenue),
      description: `${jobs.length} jobs total`,
      icon: TrendingUp,
    },
    {
      label: "Pipeline value",
      value: formatCurrency(pipelineRevenue),
      description: "Active jobs not yet completed",
      icon: HardHat,
    },
    {
      label: "Quote win rate",
      value: formatPercent(winRate),
      description: `${quoteCounts.accepted} accepted of ${sentOrDecided} decided`,
      icon: CheckCircle2,
    },
    {
      label: "Avg. margin",
      value: formatPercent(avgMargin),
      description: "Accepted quote tiers",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="type-eyebrow">Reports</p>
        <h1 className="font-display mt-1 text-2xl text-white md:text-3xl">
          Business overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue, quote performance, and job pipeline for {company!.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="border-border bg-card/80 backdrop-blur-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-blue-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Quote funnel</CardTitle>
            <CardDescription>Status breakdown across all proposals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ["draft", "Draft", "secondary"],
                ["sent", "Sent", "default"],
                ["accepted", "Accepted", "outline"],
                ["declined", "Declined", "destructive"],
              ] as const
            ).map(([status, label, variant]) => (
              <div
                key={status}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/10 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  {status === "declined" ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : null}
                  <span className="text-sm text-foreground">{label}</span>
                </div>
                <Badge variant={variant}>{quoteCounts[status]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Job summary</CardTitle>
            <CardDescription>Completed vs. in-progress contract value.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/10 p-4">
              <p className="text-sm text-muted-foreground">Completed revenue</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(completedRevenue)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/10 p-4">
              <p className="text-sm text-muted-foreground">Average job value</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(avgJobValue)}
              </p>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/app/jobs">
                View all jobs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Recent jobs</CardTitle>
          <CardDescription>Latest work created from accepted quotes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No jobs yet. Accepted quotes automatically create jobs.
            </p>
          ) : (
            recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/app/jobs/${job.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/10 px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div>
                  <p className="font-medium text-foreground capitalize">
                    {job.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(job.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <p className="font-semibold text-foreground">
                  {formatCurrency(job.selling_price)}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
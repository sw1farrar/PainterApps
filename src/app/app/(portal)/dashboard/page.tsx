import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  DollarSign,
  FileText,
  HardHat,
  Percent,
  Users,
} from "lucide-react";

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
import { formatJobAddress, type JobAddressFields } from "@/lib/address";
import {
  companyEnabledFeatures,
  companyHasExtendedPortal,
  safePortalHome,
} from "@/lib/auth/company-features";
import { filterNavByRole } from "@/lib/auth/roles";
import { requireOnboarded } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function DashboardPage() {
  const session = await requireOnboarded();
  const enabledFeatures = companyEnabledFeatures(session.company);

  if (!companyHasExtendedPortal(enabledFeatures)) {
    redirect(safePortalHome(enabledFeatures));
  }

  const envError = getSupabaseEnvError();
  const companyId = session.company?.id;

  let activeJobs = 0;
  let pendingQuotes = 0;
  let revenue = 0;
  let margin = 0;
  let queryError: string | null = null;
  let recentQuotes: (JobAddressFields & {
    id: string;
    status: string;
    updated_at: string;
    customers: { name: string } | null;
  })[] = [];
  let recentJobs: {
    id: string;
    status: string;
    selling_price: number;
    created_at: string;
    customers: { name: string } | null;
  }[] = [];

  if (!envError && companyId) {
    const supabase = await createClient();

    const [
      jobsResult,
      quotesResult,
      revenueResult,
      acceptedQuotesResult,
      recentQuotesResult,
      recentJobsResult,
    ] = await Promise.all([
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .neq("status", "completed"),
        supabase
          .from("quotes")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .in("status", ["draft", "sent"]),
        supabase
          .from("jobs")
          .select("selling_price")
          .eq("company_id", companyId),
        supabase
          .from("quotes")
          .select("id")
          .eq("company_id", companyId)
          .eq("status", "accepted"),
        supabase
          .from("quotes")
          .select(
            "id, job_address, job_address_line2, job_city, job_state, job_zip, status, updated_at, customers(name)",
          )
          .eq("company_id", companyId)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("jobs")
          .select("id, status, selling_price, created_at, customers(name)")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    if (jobsResult.error) queryError = jobsResult.error.message;
    else activeJobs = jobsResult.count ?? 0;

    if (!quotesResult.error) pendingQuotes = quotesResult.count ?? 0;

    if (!revenueResult.error && revenueResult.data) {
      revenue = revenueResult.data.reduce(
        (sum, job) => sum + (job.selling_price ?? 0),
        0,
      );
    }

    const acceptedQuoteIds =
      acceptedQuotesResult.data?.map((quote) => quote.id) ?? [];

    if (!acceptedQuotesResult.error && acceptedQuoteIds.length > 0) {
      const tiersResult = await supabase
        .from("quote_tiers")
        .select("margin")
        .in("quote_id", acceptedQuoteIds);

      if (!tiersResult.error && tiersResult.data?.length) {
        const margins = tiersResult.data.map((tier) => tier.margin ?? 0);
        margin =
          margins.reduce((sum, value) => sum + value, 0) / margins.length;
      }
    }

    if (!recentQuotesResult.error) {
      recentQuotes = (recentQuotesResult.data ??
        []) as unknown as typeof recentQuotes;
    }

    if (!recentJobsResult.error) {
      recentJobs = (recentJobsResult.data ?? []) as unknown as typeof recentJobs;
    }
  }

  const navItems = filterNavByRole(session.profile.role);
  const quickLinks = navItems.filter((item) => item.href !== "/app/dashboard");

  const stats = [
    {
      label: "Active jobs",
      value: String(activeJobs),
      icon: HardHat,
      description: "Jobs in progress",
    },
    {
      label: "Pending quotes",
      value: String(pendingQuotes),
      icon: FileText,
      description: "Draft & sent proposals",
    },
    {
      label: "Revenue",
      value: formatCurrency(revenue),
      icon: DollarSign,
      description: "Total job revenue",
    },
    {
      label: "Avg. margin",
      value: `${margin.toFixed(1)}%`,
      icon: Percent,
      description: "Accepted quote tiers",
    },
  ];

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        title="Dashboard"
        description={
          <>
            Welcome back
            {session.profile.full_name ? `, ${session.profile.full_name}` : ""}.
            Here&apos;s what&apos;s happening at{" "}
            <span className="text-foreground">{session.company?.name}</span>.
          </>
        }
      />

      {envError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{envError}</p>
          </CardContent>
        </Card>
      ) : null}

      {queryError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{queryError}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Recent quotes</CardTitle>
            <CardDescription>Latest proposal activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quotes yet.</p>
            ) : (
              <div className="scroll-bleed-x">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Customer</th>
                      <th className="pb-2 pr-4 font-medium">Address</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentQuotes.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2.5 pr-4">
                          <Link
                            href={`/app/quotes/${item.id}`}
                            className="font-medium text-foreground transition-colors hover:text-blue-200"
                          >
                            {item.customers?.name ?? "Customer"}
                          </Link>
                        </td>
                        <td className="max-w-[12rem] truncate py-2.5 pr-4 text-muted-foreground">
                          {formatJobAddress(item)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="secondary" className="capitalize">
                            {item.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap py-2.5 text-muted-foreground">
                          {format(new Date(item.updated_at), "MMM d")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Recent jobs</CardTitle>
            <CardDescription>Work created from accepted quotes.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet.</p>
            ) : (
              <div className="scroll-bleed-x">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Customer</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Value</th>
                      <th className="pb-2 font-medium">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2.5 pr-4">
                          <Link
                            href={`/app/jobs/${item.id}`}
                            className="font-medium text-foreground transition-colors hover:text-blue-200"
                          >
                            {item.customers?.name ?? "Customer"}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4 capitalize text-muted-foreground">
                          {item.status}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-4 font-semibold text-foreground">
                          {formatCurrency(item.selling_price)}
                        </td>
                        <td className="whitespace-nowrap py-2.5 text-muted-foreground">
                          {format(new Date(item.created_at), "MMM d")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
          <CardDescription>Jump to the tools you use most.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <Button
              key={item.href}
              variant="outline"
              className="h-auto justify-between px-4 py-3"
              asChild
            >
              <Link href={item.href}>
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ))}
          {quickLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              No additional sections available for your role.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="capitalize">
          {session.profile.role.replace(/_/g, " ")}
        </Badge>
        <Badge variant="outline">
          <Users className="mr-1 h-3 w-3" />
          {session.company?.name}
        </Badge>
      </div>
    </div>
  );
}
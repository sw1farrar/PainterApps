import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { listAdminCompanies } from "@/app/app/admin/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { COMPANY_FEATURE_META } from "@/lib/auth/company-features";
import { isSiteAdminSandboxCompany } from "@/lib/auth/site-admin-sandbox";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminCompaniesPage() {
  const companies = await listAdminCompanies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-white">Companies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage tenant access and feature flags.
        </p>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-white">All companies</CardTitle>
          <CardDescription>
            {companies.length} compan{companies.length === 1 ? "y" : "ies"} on
            the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No companies yet.</p>
          ) : (
            companies.map((company) => (
              <Link
                key={company.id}
                href={`/app/admin/companies/${company.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-background/20 px-4 py-3 transition hover:border-primary/30"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-white">
                      {company.name}
                    </p>
                    {isSiteAdminSandboxCompany(company) ? (
                      <Badge variant="secondary">Site sandbox</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {company.user_count} user
                    {company.user_count === 1 ? "" : "s"} · Joined{" "}
                    {formatDate(company.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(company.enabled_features ?? [])
                      .map(
                        (feature) =>
                          COMPANY_FEATURE_META[feature]?.label ?? feature,
                      )
                      .join(", ")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
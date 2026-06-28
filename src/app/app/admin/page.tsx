import Link from "next/link";
import { Building2, MailWarning, Users } from "lucide-react";

import { getAdminOverview } from "@/app/app/admin/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COMPANY_FEATURE_META } from "@/lib/auth/company-features";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-white">Site overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-tenant visibility for PainterApps operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription>Companies</CardDescription>
            <CardTitle className="text-3xl text-white">
              {overview.companyCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-3xl text-white">
              {overview.userCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription>Unconfirmed emails</CardDescription>
            <CardTitle className="text-3xl text-white">
              {overview.unconfirmedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MailWarning className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-white">Recent companies</CardTitle>
          <CardDescription>
            Newest signups and their enabled features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.recentCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No companies yet.</p>
          ) : (
            overview.recentCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/app/admin/companies/${company.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border/80 bg-background/20 px-4 py-3 transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{company.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDate(company.created_at)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(company.enabled_features ?? [])
                    .map(
                      (feature) =>
                        COMPANY_FEATURE_META[feature]?.label ?? feature,
                    )
                    .join(", ")}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getAdminCompany } from "@/app/app/admin/actions";
import { CompanyFeatureToggles } from "@/components/admin/CompanyFeatureToggles";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { companyEnabledFeatures } from "@/lib/auth/company-features";
import { isSiteAdminSandboxCompany } from "@/lib/auth/site-admin-sandbox";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminCompany(id);

  if (!data) notFound();

  const { company, users } = data;
  const enabledFeatures = companyEnabledFeatures(company);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/app/admin/companies"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All companies
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl text-white">{company.name}</h1>
          {isSiteAdminSandboxCompany(company) ? (
            <Badge variant="secondary">Site sandbox</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Slug {company.slug} · Joined {formatDate(company.created_at)}
        </p>
        {isSiteAdminSandboxCompany(company) ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Linked to site admin accounts for portal module testing. Toggle
            features here, then open Company portal to preview tenant access.
          </p>
        ) : null}
      </div>

      <CompanyFeatureToggles
        companyId={company.id}
        enabledFeatures={enabledFeatures}
      />

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-white">Company users</CardTitle>
          <CardDescription>
            {users.length} member{users.length === 1 ? "" : "s"} in this
            company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            users.map((row) => (
              <div
                key={row.profile.id}
                className="flex flex-col gap-2 rounded-lg border border-border/80 bg-background/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">
                    {row.profile.full_name ?? "Unnamed user"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.email ?? "No email"} · {row.profile.role}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {row.profile.is_site_admin ? (
                    <Badge variant="secondary">Site admin</Badge>
                  ) : null}
                  {row.email_confirmed ? (
                    <Badge variant="secondary">Confirmed</Badge>
                  ) : (
                    <Badge variant="outline">Unconfirmed</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
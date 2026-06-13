import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { subscriptionStatusMessage } from "@/lib/billing/subscription";
import type { Company, Profile } from "@/types/database";

type SubscriptionBannerProps = {
  company: Company;
  profile: Profile;
};

export function SubscriptionBanner({
  company,
  profile,
}: SubscriptionBannerProps) {
  const message = subscriptionStatusMessage(company);
  if (!message) return null;

  return (
    <div className="flex flex-col gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
      <div className="flex items-start gap-2 text-sm text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <span>{message}</span>
      </div>
      {profile.role === "admin" ? (
        <Button size="sm" variant="secondary" asChild>
          <Link href="/app/billing">Manage billing</Link>
        </Button>
      ) : (
        <p className="text-xs text-amber-200/80">
          Contact your company admin to renew.
        </p>
      )}
    </div>
  );
}
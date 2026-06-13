import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/PortalShell";
import { canAccess } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import {
  isSubscriptionActive,
  SUBSCRIPTION_EXEMPT_PATHS,
} from "@/lib/billing/subscription";
import { isStripeConfigured } from "@/lib/stripe";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  if (!session.company?.onboarding_complete) {
    redirect("/app/onboarding");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname && !canAccess(session.profile.role, pathname)) {
    redirect("/app/dashboard");
  }

  if (
    session.company &&
    isStripeConfigured() &&
    !isSubscriptionActive(session.company) &&
    pathname &&
    !SUBSCRIPTION_EXEMPT_PATHS.some((path) => pathname.startsWith(path))
  ) {
    if (session.profile.role === "admin") {
      redirect("/app/billing?required=1");
    }
    redirect("/app/dashboard?subscription_required=1");
  }

  return <PortalShell session={session}>{children}</PortalShell>;
}
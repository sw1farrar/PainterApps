import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/PortalShell";
import {
  canAccessWithFeatures,
  filterNavByRoleAndFeatures,
} from "@/lib/auth/roles";
import {
  companyEnabledFeatures,
  companyRequiresSubscription,
  safePortalHome,
} from "@/lib/auth/company-features";
import {
  isSiteAdmin,
  requireEmailConfirmed,
  requireSession,
} from "@/lib/auth/session";
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
  await requireEmailConfirmed();
  const session = await requireSession();

  if (!isSiteAdmin(session) && !session.company?.onboarding_complete) {
    redirect("/app/onboarding");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  const enabledFeatures = companyEnabledFeatures(session.company);

  if (
    pathname &&
    !canAccessWithFeatures({
      role: session.profile.role,
      company: session.company,
      path: pathname,
      isSiteAdmin: isSiteAdmin(session),
    })
  ) {
    if (isSiteAdmin(session) && !session.company) {
      redirect("/app/admin");
    }
    redirect(safePortalHome(enabledFeatures));
  }

  if (
    !isSiteAdmin(session) &&
    session.company &&
    companyRequiresSubscription(enabledFeatures) &&
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

  const navItems = filterNavByRoleAndFeatures(
    session.profile.role,
    session.company,
  );

  return (
    <PortalShell session={session} navItems={navItems}>
      {children}
    </PortalShell>
  );
}
import { redirect } from "next/navigation";

import { isSiteAdmin, requireOnboarded } from "@/lib/auth/session";
import { isStripeConfigured } from "@/lib/stripe";
import { BillingClient } from "./BillingClient";
import { syncSubscriptionStatus } from "./actions";

type PageProps = {
  searchParams: Promise<{ success?: string }>;
};

export default async function BillingPage({ searchParams }: PageProps) {
  const session = await requireOnboarded();

  if (session.profile.role !== "admin") {
    redirect("/app/dashboard");
  }

  if (!session.company) {
    redirect(isSiteAdmin(session) ? "/app/admin" : "/app/dashboard");
  }

  const params = await searchParams;

  if (params.success === "1" && session.company?.id) {
    await syncSubscriptionStatus(session.company.id);
  }

  return (
    <BillingClient
      company={session.company}
      stripeConfigured={isStripeConfigured()}
    />
  );
}
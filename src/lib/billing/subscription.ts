import { isStripeConfigured } from "@/lib/stripe";
import type { Company } from "@/types/database";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function isSubscriptionActive(company: Company): boolean {
  if (!isStripeConfigured()) return true;
  return ACTIVE_STATUSES.has(company.subscription_status);
}

export function subscriptionStatusMessage(company: Company): string | null {
  if (!isStripeConfigured() || isSubscriptionActive(company)) return null;

  switch (company.subscription_status) {
    case "past_due":
      return "Your subscription payment is past due. Renew to keep full portal access.";
    case "canceled":
      return "Your subscription has ended. Resubscribe to create new quotes and jobs.";
    case "unpaid":
      return "Your subscription is unpaid. Update billing to restore access.";
    default:
      return "Activate your subscription to unlock full portal access.";
  }
}

export const SUBSCRIPTION_EXEMPT_PATHS = [
  "/app/billing",
  "/app/profile",
  "/app/settings",
];
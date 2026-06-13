"use server";

import { redirect } from "next/navigation";

import { requireOnboarded } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getStripePriceId, isStripeConfigured } from "@/lib/stripe";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function assertBillingAdmin(role: string) {
  if (role !== "admin") {
    throw new Error("Only admins can manage billing.");
  }
}

export async function createCheckoutSession(): Promise<ActionResult> {
  try {
    if (!isStripeConfigured()) {
      return {
        success: false,
        error: "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID.",
      };
    }

    const session = await requireOnboarded();
    assertBillingAdmin(session.profile.role);

    const stripe = getStripe();
    const priceId = getStripePriceId();
    const company = session.company!;

    if (!stripe || !priceId) {
      return { success: false, error: "Stripe is not configured." };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    let customerId = company.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: company.email ?? undefined,
        name: company.name,
        metadata: { company_id: company.id },
      });
      customerId = customer.id;

      const supabase = await createClient();
      await supabase
        .from("companies")
        .update({ stripe_customer_id: customerId })
        .eq("id", company.id);
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/billing?success=1`,
      cancel_url: `${appUrl}/app/billing?canceled=1`,
      metadata: { company_id: company.id },
      subscription_data: {
        metadata: { company_id: company.id },
      },
    });

    if (!checkoutSession.url) {
      return { success: false, error: "Could not create checkout session." };
    }

    redirect(checkoutSession.url);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Checkout failed.",
    };
  }
}

export async function createBillingPortalSession(): Promise<ActionResult> {
  try {
    if (!isStripeConfigured()) {
      return { success: false, error: "Stripe is not configured." };
    }

    const session = await requireOnboarded();
    assertBillingAdmin(session.profile.role);

    const stripe = getStripe();
    const customerId = session.company?.stripe_customer_id;

    if (!stripe || !customerId) {
      return {
        success: false,
        error: "No billing account found. Subscribe first.",
      };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/app/billing`,
    });

    redirect(portalSession.url);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Billing portal failed.",
    };
  }
}

export async function syncSubscriptionStatus(
  companyId: string,
): Promise<ActionResult> {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return { success: false, error: "Stripe is not configured." };
    }

    const admin = createAdminClient();
    const { data: company } = await admin
      .from("companies")
      .select("stripe_subscription_id")
      .eq("id", companyId)
      .single();

    if (!company?.stripe_subscription_id) {
      return { success: true };
    }

    const subscription = await stripe.subscriptions.retrieve(
      company.stripe_subscription_id,
    );

    await admin
      .from("companies")
      .update({ subscription_status: subscription.status })
      .eq("id", companyId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sync failed.",
    };
  }
}
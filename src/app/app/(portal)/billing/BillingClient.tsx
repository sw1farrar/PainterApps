"use client";

import * as React from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/stripe";
import type { Company } from "@/types/database";
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "./actions";

type BillingClientProps = {
  company: Company;
  stripeConfigured: boolean;
};

function BillingActions({
  company,
  stripeConfigured,
}: BillingClientProps) {
  const [loading, setLoading] = React.useState<"checkout" | "portal" | null>(
    null,
  );

  const isActive =
    company.subscription_status === "active" ||
    company.subscription_status === "trialing";

  async function handleSubscribe() {
    setLoading("checkout");
    try {
      const result = await createCheckoutSession();
      if (!result.success) {
        toast.error(result.error ?? "Could not start checkout.");
      }
    } catch {
      // redirect() throws on success
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("portal");
    try {
      const result = await createBillingPortalSession();
      if (!result.success) {
        toast.error(result.error ?? "Could not open billing portal.");
      }
    } catch {
      // redirect() throws on success
    } finally {
      setLoading(null);
    }
  }

  if (!stripeConfigured) {
    return (
      <p className="text-sm text-muted-foreground">
        Add <code className="text-foreground">STRIPE_SECRET_KEY</code> and{" "}
        <code className="text-foreground">STRIPE_PRICE_ID</code> to enable
        subscriptions.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {isActive ? (
        <Button
          variant="outline"
          onClick={handleManage}
          disabled={loading !== null}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          {loading === "portal" ? "Opening…" : "Manage subscription"}
        </Button>
      ) : (
        <Button onClick={handleSubscribe} disabled={loading !== null}>
          <CreditCard className="mr-2 h-4 w-4" />
          {loading === "checkout" ? "Redirecting…" : "Subscribe"}
        </Button>
      )}
    </div>
  );
}

function BillingContent(props: BillingClientProps) {
  const searchParams = useSearchParams();
  const statusLabel =
    SUBSCRIPTION_STATUS_LABELS[props.company.subscription_status] ??
    props.company.subscription_status;

  React.useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Subscription updated. Thanks for subscribing!");
    }
    if (searchParams.get("canceled") === "1") {
      toast.message("Checkout canceled.");
    }
    if (searchParams.get("required") === "1") {
      toast.error("An active subscription is required to use the portal.");
    }
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="type-eyebrow">Billing</p>
        <h1 className="font-display mt-1 text-2xl text-white md:text-3xl">
          Subscription
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your PainterApps plan for {props.company.name}.
        </p>
      </div>

      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            Portal access, quotes, jobs, and team features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge
              variant={
                props.company.subscription_status === "active"
                  ? "default"
                  : "secondary"
              }
              className="capitalize"
            >
              {statusLabel}
            </Badge>
            {props.company.stripe_customer_id ? (
              <span className="text-xs text-muted-foreground">
                Customer linked
              </span>
            ) : null}
          </div>
          <BillingActions {...props} />
        </CardContent>
      </Card>
    </div>
  );
}

export function BillingClient(props: BillingClientProps) {
  return (
    <React.Suspense
      fallback={
        <div className="text-sm text-muted-foreground">Loading billing…</div>
      }
    >
      <BillingContent {...props} />
    </React.Suspense>
  );
}
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildLoginHref,
  sanitizeLoginRedirect,
} from "@/lib/auth/login-redirect";
import { resolveClientPostLoginPath } from "@/lib/auth/post-login";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { resendConfirmationEmail, verifySignupEmailCode } from "./actions";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const envError = getSupabaseEnvError();
  const returnTo = sanitizeLoginRedirect(searchParams.get("next"));

  const [email, setEmail] = React.useState(searchParams.get("email") ?? "");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [verifying, setVerifying] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    if (envError) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.email_confirmed_at) {
        router.replace(await resolveClientPostLoginPath(user.id, returnTo));
        return;
      }

      if (user?.email && !email) {
        setEmail(user.email);
      }

      setLoading(false);
    });
  }, [email, envError, returnTo, router]);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setVerifying(true);

    const result = await verifySignupEmailCode({
      email,
      code,
      next: returnTo,
    });
    setVerifying(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Email confirmed. You're signed in.");
    window.location.href = result.redirectTo;
  }

  async function handleResend() {
    setResending(true);
    const result = await resendConfirmationEmail(email);
    setResending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Confirmation code sent.");
  }

  const loginHref = buildLoginHref(returnTo);

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-display text-2xl text-white">
          Confirm your email
        </CardTitle>
        <CardDescription>
          Enter the 6-digit code we sent to your email to finish creating your
          account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {envError ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {envError}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-email">Email</Label>
                <Input
                  id="verify-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="verify-code">Confirmation code</Label>
                <Input
                  id="verify-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6-digit code"
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying ? "Confirming…" : "Confirm and continue"}
              </Button>
            </form>

            <Button
              type="button"
              className="w-full"
              variant="secondary"
              disabled={resending || !email.trim()}
              onClick={handleResend}
            >
              {resending ? "Sending…" : "Resend confirmation code"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Wrong account?{" "}
              <Link href={loginHref} className="text-primary hover:underline">
                Sign in with a different email
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense
      fallback={
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </CardContent>
        </Card>
      }
    >
      <VerifyEmailForm />
    </React.Suspense>
  );
}
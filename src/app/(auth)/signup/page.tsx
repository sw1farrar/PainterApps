"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { acceptInviteAfterSignup, loadInvitePreview } from "./actions";

function SignupForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const envError = getSupabaseEnvError();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [confirmationSent, setConfirmationSent] = React.useState(false);
  const [inviteCompany, setInviteCompany] = React.useState<string | null>(null);
  const [inviteInvalid, setInviteInvalid] = React.useState(false);

  React.useEffect(() => {
    if (!inviteToken) return;

    loadInvitePreview(inviteToken).then((preview) => {
      if (!preview || preview.expired || preview.accepted) {
        setInviteInvalid(true);
        return;
      }

      setInviteCompany(preview.companyName);
      setEmail(preview.email);
    });
  }, [inviteToken]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (envError) {
      toast.error(envError);
      return;
    }

    if (inviteInvalid) {
      toast.error("This invite link is invalid or expired.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const callbackUrl = inviteToken
      ? `${window.location.origin}/auth/callback?invite=${inviteToken}`
      : `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: callbackUrl,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      if (inviteToken) {
        const inviteResult = await acceptInviteAfterSignup(inviteToken);
        if (!inviteResult.success) {
          toast.error(inviteResult.error);
          return;
        }
        window.location.href = "/app/dashboard";
      } else {
        window.location.href = "/app/onboarding";
      }
      return;
    }

    setConfirmationSent(true);
    toast.success("Check your email to confirm your account.");
  }

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-display text-2xl text-white">
          {inviteCompany ? `Join ${inviteCompany}` : "Create account"}
        </CardTitle>
        <CardDescription>
          {inviteCompany
            ? "Create your account to accept the team invite."
            : "Start your free PainterApps portal for quotes and job management."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {envError ? (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {envError}
          </p>
        ) : null}

        {inviteInvalid ? (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This invite link is invalid or has expired. Ask your admin to send a
            new invite.
          </p>
        ) : null}

        {confirmationSent ? (
          <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            We sent a confirmation link to <strong>{email}</strong>. Click the
            link in your email to finish setting up your account.
          </p>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full name</Label>
              <Input
                id="signup-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                readOnly={Boolean(inviteToken && inviteCompany)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || inviteInvalid}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
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
      <SignupForm />
    </React.Suspense>
  );
}
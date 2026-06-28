"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { PhoneInput } from "@/components/forms/PhoneInput";
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
  buildVerifyEmailHref,
  sanitizeLoginRedirect,
} from "@/lib/auth/login-redirect";
import { isCompletePhoneNumber } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import {
  acceptInviteAfterSignup,
  loadInvitePreview,
  provisionCompanyAfterSignup,
} from "./actions";

function SignupForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const returnTo = sanitizeLoginRedirect(searchParams.get("next"));
  const envError = getSupabaseEnvError();

  const [companyName, setCompanyName] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
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

    if (inviteToken && inviteInvalid) {
      toast.error("This invite link is invalid or expired.");
      return;
    }

    if (!inviteToken && !companyName.trim()) {
      toast.error("Company name is required.");
      return;
    }

    if (!fullName.trim()) {
      toast.error("Your name is required.");
      return;
    }

    if (!inviteToken && !isCompletePhoneNumber(phone)) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const callbackParams = new URLSearchParams();
    if (inviteToken) callbackParams.set("invite", inviteToken);
    if (returnTo) callbackParams.set("next", returnTo);
    const callbackQuery = callbackParams.toString();
    const callbackUrl = `${window.location.origin}/auth/callback${callbackQuery ? `?${callbackQuery}` : ""}`;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          company_name: inviteToken ? inviteCompany ?? "" : companyName.trim(),
          phone: inviteToken ? "" : phone.trim(),
        },
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
        window.location.href = returnTo ?? "/app/dashboard";
      } else {
        const provisioned = await provisionCompanyAfterSignup();
        if (!provisioned.success) {
          toast.error(provisioned.error);
          return;
        }
        window.location.href = returnTo ?? "/app/onboarding";
      }
      return;
    }

    toast.success("Check your email for a confirmation code.");
    window.location.href = buildVerifyEmailHref(email.trim(), returnTo);
  }

  const loginHref = buildLoginHref(returnTo);

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-display text-2xl text-white">
          {inviteCompany ? `Join ${inviteCompany}` : "Create free account"}
        </CardTitle>
        <CardDescription>
          {inviteCompany
            ? "Create your account to accept the team invite."
            : "Enter your company details, then confirm your email with the code we send you."}
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

        <form onSubmit={handleSignup} className="space-y-4">
          {!inviteToken ? (
            <div className="space-y-2">
              <Label htmlFor="signup-company">Company name</Label>
              <Input
                id="signup-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Painting Co."
                required
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="signup-name">Your name</Label>
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
          {!inviteToken ? (
            <div className="space-y-2">
              <Label htmlFor="signup-phone">Phone number</Label>
              <PhoneInput
                id="signup-phone"
                value={phone}
                onChange={setPhone}
                required
              />
            </div>
          ) : null}
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

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={loginHref} className="text-primary hover:underline">
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
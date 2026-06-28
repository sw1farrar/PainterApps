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
import { Label } from "@/components/ui/label";
import {
  PASSWORD_MANAGER_LOGIN_FORM_PROPS,
  PASSWORD_MANAGER_LOGIN_PASSWORD_PROPS,
  PASSWORD_MANAGER_LOGIN_USERNAME_PROPS,
} from "@/lib/forms/password-manager";
import {
  buildVerifyEmailHref,
  isFreeToolsPath,
  sanitizeLoginRedirect,
} from "@/lib/auth/login-redirect";
import { resolveClientPostLoginPath } from "@/lib/auth/post-login";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { useLanguage } from "@/providers/LanguageProvider";

const LOGIN_INPUT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const auth = t("auth");
  const nav = t("nav");
  const envError = getSupabaseEnvError();
  const [loading, setLoading] = React.useState(false);
  const [checkingSession, setCheckingSession] = React.useState(!envError);

  const next = searchParams.get("next");
  const returnTo = sanitizeLoginRedirect(next);
  const backHref = returnTo ?? "/";
  const backLabel = returnTo && isFreeToolsPath(returnTo)
    ? nav.backToFreeTools
    : auth.backToHome;

  React.useEffect(() => {
    if (envError) return;

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        window.location.replace(
          await resolveClientPostLoginPath(user.id, next),
        );
        return;
      }
      setCheckingSession(false);
    });
  }, [envError, next]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (envError) {
      toast.error(envError);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      toast.error(auth.missingCredentials);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user && !data.user.email_confirmed_at) {
      window.location.href = buildVerifyEmailHref(
        data.user.email ?? email,
        returnTo,
      );
      return;
    }

    window.location.href = await resolveClientPostLoginPath(data.user.id, next);
  }

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-display text-2xl text-white">
          {auth.signInTitle}
        </CardTitle>
        <CardDescription>{auth.signInDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {envError ? (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {envError}
          </p>
        ) : null}

        {checkingSession ? (
          <p className="text-sm text-muted-foreground">{auth.signingIn}</p>
        ) : null}

        <form
          id="painterapps-sign-in"
          action="/login"
          method="post"
          onSubmit={handleSubmit}
          className={checkingSession ? "hidden space-y-4" : "space-y-4"}
          {...PASSWORD_MANAGER_LOGIN_FORM_PROPS}
        >
          <div className="space-y-2">
            <Label htmlFor="username">{auth.email}</Label>
            <input
              id="username"
              name="username"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="you@company.com"
              required
              disabled={loading}
              className={LOGIN_INPUT_CLASS}
              {...PASSWORD_MANAGER_LOGIN_USERNAME_PROPS}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{auth.password}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                {auth.forgotPassword}
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={loading}
              className={LOGIN_INPUT_CLASS}
              {...PASSWORD_MANAGER_LOGIN_PASSWORD_PROPS}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || Boolean(envError)}>
            {loading ? auth.signingIn : auth.signIn}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {auth.noAccount}{" "}
          <Link
            href={
              returnTo
                ? `/signup?next=${encodeURIComponent(returnTo)}`
                : "/signup"
            }
            className="text-primary hover:underline"
          >
            {auth.createAccount}
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          <Link href={backHref} className="text-primary hover:underline">
            {backLabel}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
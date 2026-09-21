"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/auth/paths";

export function SignUpForm({ nextPath }: { nextPath: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const next = safeNextPath(nextPath);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError(t("passwordMin"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setPending(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        data: { locale },
      },
    });
    setPending(false);
    if (signUpError) {
      setError(t("errorGeneric"));
      return;
    }
    if (!data.session) {
      setCheckEmail(true);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setPending(true);
    setError(null);
    setCodeSent(false);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "signup",
    });
    setPending(false);
    if (verifyError) {
      setError(t("errorGeneric"));
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onResend() {
    const supabase = createClient();
    if (!supabase) return;
    setPending(true);
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setPending(false);
    if (resendError) {
      setError(t("errorGeneric"));
      return;
    }
    setCodeSent(true);
  }

  if (checkEmail) {
    return (
      <form
        onSubmit={onConfirm}
        className="space-y-4"
        data-allow-password-manager="true"
      >
        <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          {t("checkEmail")}
        </p>
        <div>
          <Label htmlFor="code">{t("code")}</Label>
          <Input
            id="code"
            className="mt-2"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {codeSent ? (
          <p className="text-sm text-muted-foreground">{t("codeSent")}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {t("confirmEmail")}
        </Button>
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-4"
          disabled={pending}
          onClick={onResend}
        >
          {t("resendCode")}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      data-allow-password-manager="true"
    >
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          className="mt-2"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          className="mt-2"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="confirm">{t("confirmPassword")}</Label>
        <Input
          id="confirm"
          className="mt-2"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {t("createAccount")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {t("agreeSignup")}{" "}
        <Link href="/terms" className="underline underline-offset-4">
          {t("termsLink")}
        </Link>{" "}
        {t("and")}{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          {t("privacyLink")}
        </Link>
        .
      </p>
      <p className="text-center text-sm text-muted-foreground">
        <Link
          href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
          className="underline underline-offset-4"
        >
          {t("haveAccount")}
        </Link>
      </p>
    </form>
  );
}

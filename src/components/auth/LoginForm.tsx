"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/auth/paths";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const next = safeNextPath(nextPath);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setPending(true);
    setError(null);

    if (forgot) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/login/reset`,
        },
      );
      setPending(false);
      if (resetError) {
        setError(t("errorGeneric"));
        return;
      }
      setResetSent(true);
      return;
    }

    const { error: signInError, data: signed } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    if (signInError) {
      setPending(false);
      setError(t("errorInvalid"));
      return;
    }
    const userId = signed.user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("access_enabled")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile?.access_enabled === false) {
        await supabase.auth.signOut();
        setPending(false);
        setError(t("errorDisabled"));
        return;
      }
    }
    setPending(false);
    router.push(next);
    router.refresh();
  }

  if (resetSent) {
    return (
      <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t("resetSent")}
      </p>
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
      {forgot ? null : (
        <div>
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            className="mt-2"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {forgot ? t("sendReset") : t("signIn")}
      </Button>
      <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => {
            setForgot((v) => !v);
            setError(null);
          }}
        >
          {forgot ? t("backToLogin") : t("forgot")}
        </button>
        {forgot ? null : (
          <Link href="/sign-up" className="underline underline-offset-4">
            {t("noAccount")}
          </Link>
        )}
      </div>
    </form>
  );
}

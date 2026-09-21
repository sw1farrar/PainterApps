"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function AccountEmailForm({ email }: { email: string }) {
  const t = useTranslations("app");
  const [nextEmail, setNextEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    const value = nextEmail.trim().toLowerCase();
    if (!value.includes("@") || value === email.toLowerCase()) {
      setStatus("error");
      setMessage(t("emailChangeInvalid"));
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setStatus("error");
      setMessage(t("emailChangeFail"));
      return;
    }
    const origin = window.location.origin;
    const { error } = await supabase.auth.updateUser(
      { email: value },
      { emailRedirectTo: `${origin}/auth/callback?next=/app/settings` },
    );
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage(t("emailChangeSent"));
    setNextEmail("");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        {t("loginEmail")}: <span className="font-medium">{email}</span>
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          name="new_email"
          autoComplete="email"
          data-allow-password-manager
          placeholder={t("newEmail")}
          value={nextEmail}
          onChange={(e) => setNextEmail(e.target.value)}
          required
        />
        <Button type="submit">{t("changeEmail")}</Button>
      </form>
      {message ? (
        <p
          role="alert"
          className={
            status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

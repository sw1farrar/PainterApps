"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";

export function AuthButtons({
  authEnabled,
  signedIn,
}: {
  authEnabled: boolean;
  signedIn: boolean;
}) {
  const t = useTranslations("nav");
  const links = (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">{t("login")}</Link>
      </Button>
      <Button asChild size="sm" className="paint-gradient border-0 text-white">
        <Link href="/sign-up">{t("signup")}</Link>
      </Button>
    </div>
  );

  if (!authEnabled || !signedIn) return links;

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href="/app">{t("app")}</Link>
      </Button>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";

export function AuthButtons({
  authEnabled,
  signedIn,
  loginLabel,
  signupLabel,
  signOutLabel,
}: {
  authEnabled: boolean;
  signedIn: boolean;
  loginLabel: string;
  signupLabel: string;
  signOutLabel: string;
}) {
  const links = (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">{loginLabel}</Link>
      </Button>
      <Button asChild size="sm" className="paint-gradient border-0 text-white">
        <Link href="/sign-up">{signupLabel}</Link>
      </Button>
    </div>
  );

  if (!authEnabled || !signedIn) return links;

  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        {signOutLabel}
      </Button>
    </form>
  );
}

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthConfigShell } from "@/components/auth/AuthConfigShell";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { currentUserId } from "@/lib/auth/current-user";
import { safeNextPath } from "@/lib/auth/paths";
import { supabaseEnabled } from "@/lib/env";

export const metadata = { title: "Create account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect_url?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next ?? params.redirect_url);
  const userId = await currentUserId();
  if (userId) redirect(next);

  if (!supabaseEnabled()) {
    return <AuthConfigShell />;
  }

  const t = await getTranslations("auth");
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">{t("signupTitle")}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t("signupBody")}</p>
      <SignUpForm nextPath={next} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthConfigShell } from "@/components/auth/AuthConfigShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { currentUserId } from "@/lib/auth/current-user";
import { supabaseEnabled } from "@/lib/env";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage() {
  if (!supabaseEnabled()) {
    return <AuthConfigShell />;
  }
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const t = await getTranslations("auth");
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">{t("resetTitle")}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t("resetBody")}</p>
      <ResetPasswordForm />
    </div>
  );
}

import { redirect } from "next/navigation";

import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await requireOnboarded();

  if (session.profile.role !== "admin") {
    redirect("/app/dashboard");
  }

  const supabase = await createClient();
  const { data: upgradeRules } = await supabase
    .from("quote_upgrade_rules")
    .select("*")
    .eq("company_id", session.company!.id)
    .maybeSingle();

  return (
    <SettingsClient
      company={session.company!}
      upgradeRules={upgradeRules}
    />
  );
}
import { redirect } from "next/navigation";

import { isSiteAdmin, requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TeamClient } from "./TeamClient";

export default async function TeamPage() {
  const session = await requireOnboarded();

  if (session.profile.role !== "admin") {
    redirect("/app/dashboard");
  }

  if (!session.company) {
    redirect(isSiteAdmin(session) ? "/app/admin" : "/app/dashboard");
  }

  const supabase = await createClient();
  const companyId = session.company.id;

  const [membersResult, invitesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
    supabase
      .from("team_invites")
      .select("id, email, role, created_at, expires_at")
      .eq("company_id", companyId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  return (
    <TeamClient
      members={membersResult.data ?? []}
      invites={invitesResult.data ?? []}
      currentUserId={session.profile.id}
    />
  );
}
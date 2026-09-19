import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type JobOption = { id: string; title: string; zip: string | null };

export async function listMyJobs(): Promise<JobOption[]> {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return [];
  const { data } = await supabase
    .from("jobs")
    .select("id,title,zip")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

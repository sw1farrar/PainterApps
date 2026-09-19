import { createClient } from "@/lib/supabase/server";

export async function ensureProfile(userId: string) {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("profiles").upsert(
    { user_id: userId },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
}

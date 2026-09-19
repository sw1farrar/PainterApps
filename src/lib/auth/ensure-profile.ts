import { createClient } from "@/lib/supabase/server";

export async function ensureProfile(
  userId: string,
  locale = "en",
  units = "imperial",
) {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("profiles").upsert({
    user_id: userId,
    locale,
    units,
  });
}

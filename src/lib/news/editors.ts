import { currentUserId } from "@/lib/auth/current-user";
import { createClient, supabaseAdmin } from "@/lib/supabase/server";

export function editorIdsFromEnv() {
  return (process.env.NEWS_EDITOR_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function isNewsEditor(userId: string | null) {
  if (!userId) return false;
  const ids = editorIdsFromEnv();
  if (ids.includes(userId)) return true;
  const admin = supabaseAdmin();
  if (admin) {
    const { data } = await admin
      .from("profiles")
      .select("is_editor")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.is_editor) return true;
  }
  const supabase = await createClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_editor")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data?.is_editor);
}

export async function requireNewsEditor() {
  const userId = await currentUserId();
  const ok = await isNewsEditor(userId);
  return ok ? userId : null;
}

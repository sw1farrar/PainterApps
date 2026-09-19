import { currentUserId } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

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
  const db = supabaseAdmin();
  if (!db) return false;
  const { data } = await db
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

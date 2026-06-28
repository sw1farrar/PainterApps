import {
  resolvePostLoginRedirect,
  sanitizeLoginRedirect,
} from "@/lib/auth/login-redirect";
import { createClient } from "@/lib/supabase/client";

export async function resolveClientPostLoginPath(
  userId: string,
  next?: string | null,
): Promise<string> {
  const safeNext = sanitizeLoginRedirect(next ?? null);
  if (safeNext) return safeNext;

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_site_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_site_admin) {
    return "/app/admin";
  }

  return resolvePostLoginRedirect(next);
}
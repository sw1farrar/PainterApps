import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const currentUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
});

export async function currentUserId(): Promise<string | null> {
  const user = await currentUser();
  return user?.id ?? null;
}

export async function currentUserEmail(): Promise<string | null> {
  const user = await currentUser();
  return user?.email ?? null;
}

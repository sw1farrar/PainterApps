import { currentUserId } from "@/lib/auth/current-user";
import { windowFromTopcoatName, type ProductWindow } from "@/lib/paintday/product-window";
import { createClient } from "@/lib/supabase/server";

export async function productWindowForZip(zip: string): Promise<ProductWindow | undefined> {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return undefined;
  const { data } = await supabase
    .from("jobs")
    .select("system_snapshot")
    .eq("user_id", userId)
    .eq("zip", zip)
    .not("system_snapshot", "is", null)
    .order("created_at", { ascending: false })
    .limit(3);
  for (const row of data ?? []) {
    const snap = row.system_snapshot as { topcoat?: { name?: string } } | null;
    const window = windowFromTopcoatName(snap?.topcoat?.name);
    if (window) return window;
  }
  return undefined;
}

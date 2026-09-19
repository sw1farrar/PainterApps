"use server";

import { revalidatePath } from "next/cache";
import { currentUserId } from "@/lib/auth/current-user";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { createClient } from "@/lib/supabase/server";

export async function saveJob(formData: FormData) {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return;
  await ensureProfile(userId);
  await supabase.from("jobs").insert({
    user_id: userId,
    title: String(formData.get("title") ?? "Untitled job"),
    zip: String(formData.get("zip") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  });
  revalidatePath("/app/jobs");
  revalidatePath("/app");
}

export async function deleteJob(id: string) {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return;
  await supabase.from("jobs").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/jobs");
  revalidatePath("/app");
}

"use server";

import { revalidatePath } from "next/cache";
import { currentUserId } from "@/lib/auth/current-user";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { geocodeZip } from "@/lib/geo/geocode";
import { createClient } from "@/lib/supabase/server";
import { isUsZip } from "@/lib/utils";

export async function saveLocation(formData: FormData) {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return;
  await ensureProfile(userId);
  const zip = String(formData.get("zip") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || zip;
  if (!isUsZip(zip)) return;
  const place = await geocodeZip(zip);
  await supabase.from("locations").insert({
    user_id: userId,
    label,
    zip,
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
    is_default: false,
  });
  revalidatePath("/app");
  revalidatePath("/app/locations");
}

export async function deleteLocation(id: string) {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return;
  await supabase.from("locations").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app");
  revalidatePath("/app/locations");
}

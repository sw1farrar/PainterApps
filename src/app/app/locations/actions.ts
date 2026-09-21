"use server";

import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth/access";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { geocodeZip } from "@/lib/geo/geocode";
import { createClient } from "@/lib/supabase/server";
import { isUsZip } from "@/lib/utils";

export async function saveLocation(formData: FormData) {
  const access = await requireAccess("/app/locations");
  const supabase = await createClient();
  if (!supabase) return;
  await ensureProfile(access.userId);
  const userId = access.userId;
  const zip = String(formData.get("zip") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || zip;
  if (!isUsZip(zip)) return;
  const place = await geocodeZip(zip);
  const { count } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  await supabase.from("locations").insert({
    user_id: userId,
    company_id: access.companyId ?? null,
    label,
    zip,
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
    is_default: !count,
  });
  revalidatePath("/app");
  revalidatePath("/app/locations");
  revalidatePath("/app/settings");
}

export async function setDefaultLocation(id: string) {
  const access = await requireAccess("/app/settings");
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("locations")
    .update({ is_default: false })
    .eq("user_id", access.userId);
  await supabase.from("locations").update({ is_default: true }).eq("id", id);
  revalidatePath("/app");
  revalidatePath("/app/settings");
}

export async function deleteLocation(id: string) {
  await requireAccess("/app/locations");
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("locations").delete().eq("id", id);
  revalidatePath("/app");
  revalidatePath("/app/locations");
  revalidatePath("/app/settings");
}

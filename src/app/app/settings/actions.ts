"use server";

import { revalidatePath } from "next/cache";
import { currentUserId } from "@/lib/auth/current-user";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { createClient } from "@/lib/supabase/server";
import { isUnitSystem, type UnitSystem } from "@/lib/units";

export async function setUnitsAction(units: UnitSystem) {
  if (!isUnitSystem(units)) return;
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return;
  await ensureProfile(userId);
  await supabase.from("profiles").update({ units }).eq("user_id", userId);
  revalidatePath("/app/settings");
  revalidatePath("/calc");
  revalidatePath("/systems");
}

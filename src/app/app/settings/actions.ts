"use server";

import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth/access";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { createClient } from "@/lib/supabase/server";
import { isUnitSystem, type UnitSystem } from "@/lib/units";

export async function setUnitsAction(units: UnitSystem) {
  if (!isUnitSystem(units)) return;
  const access = await requireAccess("/app/settings");
  const supabase = await createClient();
  if (!supabase) return;
  await ensureProfile(access.userId);
  const userId = access.userId;
  await supabase.from("profiles").update({ units }).eq("user_id", userId);
  revalidatePath("/app/settings");
  revalidatePath("/calc");
  revalidatePath("/systems");
}

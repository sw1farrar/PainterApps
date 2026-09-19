import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { isUnitSystem, type UnitSystem } from "@/lib/units";

export async function currentUnits(): Promise<UnitSystem> {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return "imperial";
  const { data } = await supabase
    .from("profiles")
    .select("units")
    .eq("user_id", userId)
    .maybeSingle();
  return isUnitSystem(data?.units) ? data.units : "imperial";
}

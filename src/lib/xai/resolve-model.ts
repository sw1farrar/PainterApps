import { cache } from "react";

import { getXaiModel } from "@/lib/xai/env";
import {
  DEFAULT_XAI_MODEL_TIER,
  type XaiModelTier,
  xaiModelIdForTier,
} from "@/lib/xai/models";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeTier(value: unknown): XaiModelTier {
  if (value === "economy") return "economy";
  return DEFAULT_XAI_MODEL_TIER;
}

async function resolveXaiModelFromDatabase(): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("site_settings")
      .select("xai_model_tier")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return null;
    return xaiModelIdForTier(normalizeTier(data.xai_model_tier));
  } catch {
    return null;
  }
}

export async function resolveXaiModelUncached(): Promise<string> {
  const fromDatabase = await resolveXaiModelFromDatabase();
  if (fromDatabase) return fromDatabase;
  return getXaiModel();
}

export const resolveXaiModel = cache(resolveXaiModelUncached);
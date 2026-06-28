import "server-only";

import { cache } from "react";

import {
  DEFAULT_XAI_MODEL_TIER,
  type XaiModelTier,
  xaiModelIdForTier,
} from "@/lib/xai/models";
import { createAdminClient } from "@/lib/supabase/admin";

export type SiteSettings = {
  xaiModelTier: XaiModelTier;
  updatedAt: string | null;
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  xaiModelTier: DEFAULT_XAI_MODEL_TIER,
  updatedAt: null,
};

function normalizeTier(value: unknown): XaiModelTier {
  if (value === "economy") return "economy";
  return DEFAULT_XAI_MODEL_TIER;
}

export const loadSiteSettings = cache(async (): Promise<SiteSettings> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .select("xai_model_tier, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_SITE_SETTINGS;
  }

  return {
    xaiModelTier: normalizeTier(data.xai_model_tier),
    updatedAt: data.updated_at ?? null,
  };
});

export { resolveXaiModel } from "@/lib/xai/resolve-model";
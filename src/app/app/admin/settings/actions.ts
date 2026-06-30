"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/app/app/admin/types";
import { requireSiteAdmin } from "@/lib/auth/session";
import { ensureSiteSettingsSchema } from "@/lib/site-settings/ensure-schema";
import {
  loadSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings/load-site-settings";
import {
  isXaiModelTier,
  xaiModelIdForTier,
  type XaiModelTier,
} from "@/lib/xai/models";
import { createAdminClient } from "@/lib/supabase/admin";

export type SiteSettingsView = SiteSettings & {
  activeModelId: string;
  schemaWarning: string | null;
};

export async function getSiteSettings(): Promise<SiteSettingsView> {
  await requireSiteAdmin();
  const schema = await ensureSiteSettingsSchema();
  const settings = await loadSiteSettings();

  return {
    ...settings,
    activeModelId: xaiModelIdForTier(settings.xaiModelTier),
    schemaWarning: schema.ready ? null : (schema.message ?? null),
  };
}

export async function updateSiteXaiModelTier(
  tier: XaiModelTier,
): Promise<ActionResult<SiteSettingsView>> {
  const session = await requireSiteAdmin();

  if (!isXaiModelTier(tier)) {
    return { success: false, error: "Invalid AI model selection." };
  }

  const schema = await ensureSiteSettingsSchema();
  if (!schema.ready) {
    return {
      success: false,
      error:
        schema.message ??
        "Site settings schema is not ready. Run npm run db:migrate:021.",
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .update({
      xai_model_tier: tier,
      updated_at: new Date().toISOString(),
      updated_by: session.profile.id,
    })
    .eq("id", 1)
    .select("xai_model_tier, updated_at")
    .single();

  if (error || !data) {
    return {
      success: false,
      error:
        error?.message ??
        "Could not save site settings. Run migration 021_site_settings.sql if this table is missing.",
    };
  }

  revalidatePath("/app/admin/settings");
  revalidatePath("/app/admin/product-catalog");

  const xaiModelTier = data.xai_model_tier === "economy" ? "economy" : "premium";

  return {
    success: true,
    data: {
      xaiModelTier,
      updatedAt: data.updated_at ?? null,
      activeModelId: xaiModelIdForTier(xaiModelTier),
      schemaWarning: null,
    },
  };
}
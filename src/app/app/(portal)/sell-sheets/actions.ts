"use server";

import { getSession, requireSession } from "@/lib/auth/session";
import { sellSheetDataFromStored } from "@/lib/sell-sheet/persist";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import type { SellSheet } from "@/types/database";
import type { SellSheetData } from "@/types/sell-sheet";

export async function listSellSheets(): Promise<SellSheet[]> {
  const envError = getSupabaseEnvError();
  if (envError) return [];

  const session = await requireSession();
  if (!session.company?.id) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("sell_sheets")
    .select("*")
    .eq("company_id", session.company.id)
    .order("updated_at", { ascending: false });

  return (data ?? []) as SellSheet[];
}

export async function getSellSheetRecord(
  id: string,
): Promise<{ record: SellSheet; data: SellSheetData } | null> {
  const envError = getSupabaseEnvError();
  if (envError) return null;

  const session = await getSession();
  if (!session?.company?.id) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("sell_sheets")
    .select("*")
    .eq("id", id)
    .eq("company_id", session.company.id)
    .maybeSingle();

  if (!data) return null;

  const record = data as SellSheet;

  return {
    record,
    data: sellSheetDataFromStored(session.company.name, session.company.logo_url, {
      project_name: record.project_name,
      application_type: record.application_type,
      logo_url: record.logo_url,
      tiers: record.tiers,
    }),
  };
}
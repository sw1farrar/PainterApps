"use server";

import { requireSession } from "@/lib/auth/session";
import {
  type BenefitLibrary,
  parseBenefitLibrary,
} from "@/lib/sell-sheet/benefit-library";
import {
  isValidLibraryLabel,
  normalizeLibraryLabel,
  parseSellSheetLibrary,
} from "@/lib/sell-sheet/company-library";
import type {
  SellSheetFeatureCategoryId,
  SellSheetFeatureScope,
} from "@/lib/sell-sheet/feature-catalog-data";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type SellSheetLibraries = {
  benefitLibrary: BenefitLibrary;
  paintSystemLibrary: string[];
};

export type BenefitLibraryActionResult =
  | { success: true; library: BenefitLibrary }
  | { success: false; error: string };

export type LibraryActionResult =
  | { success: true; library: string[] }
  | { success: false; error: string };

type LibraryColumn =
  | "sell_sheet_benefit_library"
  | "sell_sheet_paint_system_library";

export async function getCompanySellSheetLibraries(): Promise<SellSheetLibraries | null> {
  const envError = getSupabaseEnvError();
  if (envError) return null;

  const session = await requireSession();
  if (!session.company?.id) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("sell_sheet_benefit_library, sell_sheet_paint_system_library")
    .eq("id", session.company.id)
    .maybeSingle();

  if (!data) return null;

  return {
    benefitLibrary: parseBenefitLibrary(data.sell_sheet_benefit_library),
    paintSystemLibrary: parseSellSheetLibrary(
      data.sell_sheet_paint_system_library,
    ),
  };
}

export async function addBenefitLibraryItem(
  label: string,
  category: SellSheetFeatureCategoryId,
  scope: SellSheetFeatureScope,
): Promise<BenefitLibraryActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const normalized = normalizeLibraryLabel(label);
  if (!isValidLibraryLabel(normalized)) {
    return { success: false, error: "Enter a valid library item." };
  }

  const session = await requireSession();
  if (!session.company?.id) {
    return { success: false, error: "Sign in to manage your library." };
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("sell_sheet_benefit_library")
    .eq("id", session.company.id)
    .maybeSingle();

  if (!company) {
    return { success: false, error: "Company not found." };
  }

  const current = parseBenefitLibrary(company.sell_sheet_benefit_library);
  if (current.custom.some((item) => item.label === normalized)) {
    return { success: true, library: current };
  }

  const next: BenefitLibrary = {
    ...current,
    custom: [...current.custom, { label: normalized, category, scope }],
  };

  const { error } = await supabase
    .from("companies")
    .update({ sell_sheet_benefit_library: next })
    .eq("id", session.company.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, library: next };
}

export async function removeBenefitLibraryItem(
  label: string,
): Promise<BenefitLibraryActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const normalized = normalizeLibraryLabel(label);
  if (!normalized) {
    return { success: false, error: "Item not found." };
  }

  const session = await requireSession();
  if (!session.company?.id) {
    return { success: false, error: "Sign in to manage your library." };
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("sell_sheet_benefit_library")
    .eq("id", session.company.id)
    .maybeSingle();

  if (!company) {
    return { success: false, error: "Company not found." };
  }

  const current = parseBenefitLibrary(company.sell_sheet_benefit_library);
  const next: BenefitLibrary = {
    ...current,
    custom: current.custom.filter((item) => item.label !== normalized),
  };

  const { error } = await supabase
    .from("companies")
    .update({ sell_sheet_benefit_library: next })
    .eq("id", session.company.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, library: next };
}

export async function hideCatalogBenefitItem(
  catalogId: string,
): Promise<BenefitLibraryActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const id = catalogId.trim();
  if (!id) {
    return { success: false, error: "Item not found." };
  }

  const session = await requireSession();
  if (!session.company?.id) {
    return { success: false, error: "Sign in to manage your library." };
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("sell_sheet_benefit_library")
    .eq("id", session.company.id)
    .maybeSingle();

  if (!company) {
    return { success: false, error: "Company not found." };
  }

  const current = parseBenefitLibrary(company.sell_sheet_benefit_library);
  if (current.hiddenCatalogIds.includes(id)) {
    return { success: true, library: current };
  }

  const next: BenefitLibrary = {
    ...current,
    hiddenCatalogIds: [...current.hiddenCatalogIds, id],
  };

  const { error } = await supabase
    .from("companies")
    .update({ sell_sheet_benefit_library: next })
    .eq("id", session.company.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, library: next };
}

export async function unhideCatalogBenefitItem(
  catalogId: string,
): Promise<BenefitLibraryActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const id = catalogId.trim();
  if (!id) {
    return { success: false, error: "Item not found." };
  }

  const session = await requireSession();
  if (!session.company?.id) {
    return { success: false, error: "Sign in to manage your library." };
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("sell_sheet_benefit_library")
    .eq("id", session.company.id)
    .maybeSingle();

  if (!company) {
    return { success: false, error: "Company not found." };
  }

  const current = parseBenefitLibrary(company.sell_sheet_benefit_library);
  const next: BenefitLibrary = {
    ...current,
    hiddenCatalogIds: current.hiddenCatalogIds.filter((entry) => entry !== id),
  };

  const { error } = await supabase
    .from("companies")
    .update({ sell_sheet_benefit_library: next })
    .eq("id", session.company.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, library: next };
}

export async function addPaintSystemLibraryItem(
  label: string,
): Promise<LibraryActionResult> {
  return addLibraryItem("sell_sheet_paint_system_library", label);
}

export async function removePaintSystemLibraryItem(
  label: string,
): Promise<LibraryActionResult> {
  return removeLibraryItem("sell_sheet_paint_system_library", label);
}

async function addLibraryItem(
  column: LibraryColumn,
  label: string,
): Promise<LibraryActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const normalized = normalizeLibraryLabel(label);
  if (!isValidLibraryLabel(normalized)) {
    return { success: false, error: "Enter a valid library item." };
  }

  const session = await requireSession();
  if (!session.company?.id) {
    return { success: false, error: "Sign in to manage your library." };
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("sell_sheet_benefit_library, sell_sheet_paint_system_library")
    .eq("id", session.company.id)
    .maybeSingle();

  if (!company) {
    return { success: false, error: "Company not found." };
  }

  const current = parseSellSheetLibrary(company[column]);
  if (current.includes(normalized)) {
    return { success: true, library: current };
  }

  const next = [...current, normalized];
  const updatePayload =
    column === "sell_sheet_paint_system_library"
      ? { sell_sheet_paint_system_library: next }
      : { sell_sheet_benefit_library: next };

  const { error } = await supabase
    .from("companies")
    .update(updatePayload)
    .eq("id", session.company.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, library: next };
}

async function removeLibraryItem(
  column: LibraryColumn,
  label: string,
): Promise<LibraryActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const normalized = normalizeLibraryLabel(label);
  if (!normalized) {
    return { success: false, error: "Item not found." };
  }

  const session = await requireSession();
  if (!session.company?.id) {
    return { success: false, error: "Sign in to manage your library." };
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("sell_sheet_benefit_library, sell_sheet_paint_system_library")
    .eq("id", session.company.id)
    .maybeSingle();

  if (!company) {
    return { success: false, error: "Company not found." };
  }

  const current = parseSellSheetLibrary(company[column]);
  const next = current.filter((item) => item !== normalized);
  const updatePayload =
    column === "sell_sheet_paint_system_library"
      ? { sell_sheet_paint_system_library: next }
      : { sell_sheet_benefit_library: next };

  const { error } = await supabase
    .from("companies")
    .update(updatePayload)
    .eq("id", session.company.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, library: next };
}
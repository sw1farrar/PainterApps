import {
  formatListInput,
  parseListInput,
} from "@/lib/product-catalog/parse-list-input";
import type {
  PaintProductApplication,
  PaintProductBase,
  PaintProductUse,
  PaintResinSystem,
  PaintSubstrate,
  PaintVocLevel,
} from "@/lib/product-catalog/types";

import { DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON } from "@/lib/paint-library/coverage";
import type { CompanyPaintProductRow } from "@/lib/paint-library/types";
import {
  formatMoneyInputOnBlur,
  parseMoneyInput,
  toMoneyInputString,
} from "@/lib/utils";
import type { CompanyPaintProductRole } from "@/types/database";

export type CustomProductFormValues = {
  name: string;
  manufacturerName: string;
  role: CompanyPaintProductRole;
  applicationType: PaintProductApplication;
  baseType: PaintProductBase;
  resinType: string;
  resinSystem: PaintResinSystem;
  unitCost: string;
  unitPrice: string;
  coverageSqftPerGallon: string;
  gallonsPerLaborHour: string;
  productDescription: string;
  sourceUrl: string;
  sheen: string;
  sheenOptionsText: string;
  paintSystemFeaturesText: string;
  paintSystemFeatureOptionsText: string;
  recommendedUsesText: string;
  productUses: PaintProductUse[];
  substrates: PaintSubstrate[];
  vocLevel: PaintVocLevel;
  volumeSolidsPct: string;
  volumeSolidsLabel: string;
  canImageUrl: string;
  canImageStoragePath: string;
  isSelfPriming: boolean;
  isStainBlocking: boolean;
  isMoldMildewResistant: boolean;
  isScrubbable: boolean;
  isOneCoat: boolean;
};

export type SaveCustomPaintProductInput = {
  id?: string;
  name: string;
  manufacturerName?: string;
  role: CompanyPaintProductRole;
  unitCost: number;
  unitPrice?: number;
  gallonsPerLaborHour?: number | null;
  coverageSqftPerGallon?: number;
  applicationType?: string;
  baseType?: PaintProductBase;
  resinType?: string | null;
  resinSystem?: PaintResinSystem;
  productDescription?: string | null;
  sourceUrl?: string | null;
  sheen?: string | null;
  sheenOptions?: string[];
  paintSystemFeatures?: string[];
  paintSystemFeatureOptions?: string[];
  recommendedUses?: string[];
  productUses?: PaintProductUse[];
  substrates?: PaintSubstrate[];
  vocLevel?: PaintVocLevel;
  volumeSolidsPct?: number | null;
  volumeSolidsLabel?: string | null;
  canImageUrl?: string | null;
  canImageStoragePath?: string | null;
  isSelfPriming?: boolean;
  isStainBlocking?: boolean;
  isMoldMildewResistant?: boolean;
  isScrubbable?: boolean;
  isOneCoat?: boolean;
};

export function createDefaultCustomProductForm(
  companyCoverage: number = DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
): CustomProductFormValues {
  return {
    name: "",
    manufacturerName: "",
    role: "topcoat",
    applicationType: "both",
    baseType: "unknown",
    resinType: "",
    resinSystem: "unknown",
    unitCost: "0.00",
    unitPrice: "0.00",
    coverageSqftPerGallon: String(companyCoverage),
    gallonsPerLaborHour: "",
    productDescription: "",
    sourceUrl: "",
    sheen: "",
    sheenOptionsText: "",
    paintSystemFeaturesText: "",
    paintSystemFeatureOptionsText: "",
    recommendedUsesText: "",
    productUses: [],
    substrates: [],
    vocLevel: "unknown",
    volumeSolidsPct: "",
    volumeSolidsLabel: "",
    canImageUrl: "",
    canImageStoragePath: "",
    isSelfPriming: false,
    isStainBlocking: false,
    isMoldMildewResistant: false,
    isScrubbable: false,
    isOneCoat: false,
  };
}

export function customProductFormFromRow(
  product: CompanyPaintProductRow,
  companyCoverage: number = DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
): CustomProductFormValues {
  return {
    name: product.name,
    manufacturerName: product.manufacturer_name ?? "",
    role: product.role,
    applicationType: product.application_type as PaintProductApplication,
    baseType: (product.base_type as PaintProductBase) ?? "unknown",
    resinType: product.resin_type ?? "",
    resinSystem: (product.resin_system as PaintResinSystem) ?? "unknown",
    unitCost: toMoneyInputString(product.unit_cost),
    unitPrice: toMoneyInputString(product.unit_price ?? product.unit_cost),
    coverageSqftPerGallon: String(
      product.coverage_sqft_per_gallon ?? companyCoverage,
    ),
    gallonsPerLaborHour:
      product.gallons_per_labor_hour != null
        ? String(product.gallons_per_labor_hour)
        : "",
    productDescription: product.product_description ?? "",
    sourceUrl: product.source_url ?? "",
    sheen: product.sheen ?? "",
    sheenOptionsText: formatListInput(product.sheen_options ?? []),
    paintSystemFeaturesText: formatListInput(product.paint_system_features),
    paintSystemFeatureOptionsText: formatListInput(
      product.paint_system_feature_options ?? [],
    ),
    recommendedUsesText: formatListInput(product.recommended_uses ?? []),
    productUses: (product.product_uses ?? []) as PaintProductUse[],
    substrates: (product.substrates ?? []) as PaintSubstrate[],
    vocLevel: (product.voc_level as PaintVocLevel) ?? "unknown",
    volumeSolidsPct:
      product.volume_solids_pct != null ? String(product.volume_solids_pct) : "",
    volumeSolidsLabel: product.volume_solids_label ?? "",
    canImageUrl: product.can_image_url ?? "",
    canImageStoragePath: product.can_image_storage_path ?? "",
    isSelfPriming: product.is_self_priming,
    isStainBlocking: product.is_stain_blocking ?? false,
    isMoldMildewResistant: product.is_mold_mildew_resistant ?? false,
    isScrubbable: product.is_scrubbable ?? false,
    isOneCoat: product.is_one_coat ?? false,
  };
}

export function customProductFormToSaveInput(
  form: CustomProductFormValues,
  companyCoverage: number = DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON,
  id?: string,
): SaveCustomPaintProductInput {
  const unitCost = parseMoneyInput(form.unitCost);

  return {
    id,
    name: form.name.trim(),
    manufacturerName: form.manufacturerName.trim() || undefined,
    role: form.role,
    unitCost,
    unitPrice: unitCost,
    gallonsPerLaborHour: form.gallonsPerLaborHour
      ? Number(form.gallonsPerLaborHour)
      : null,
    coverageSqftPerGallon:
      Number(form.coverageSqftPerGallon) || companyCoverage,
    applicationType: form.applicationType,
    baseType: form.baseType,
    resinType: form.resinType.trim() || null,
    resinSystem: form.resinSystem,
    productDescription: form.productDescription.trim() || null,
    sourceUrl: form.sourceUrl.trim() || null,
    sheen: form.sheen.trim() || null,
    sheenOptions: parseListInput(form.sheenOptionsText),
    paintSystemFeatures: parseListInput(form.paintSystemFeaturesText),
    paintSystemFeatureOptions: parseListInput(form.paintSystemFeatureOptionsText),
    recommendedUses: parseListInput(form.recommendedUsesText),
    productUses: form.productUses,
    substrates: form.substrates,
    vocLevel: form.vocLevel,
    volumeSolidsPct: form.volumeSolidsPct.trim()
      ? Number(form.volumeSolidsPct)
      : null,
    volumeSolidsLabel: form.volumeSolidsLabel.trim() || null,
    canImageUrl: form.canImageUrl.trim() || null,
    canImageStoragePath: form.canImageStoragePath.trim() || null,
    isSelfPriming: form.isSelfPriming,
    isStainBlocking: form.isStainBlocking,
    isMoldMildewResistant: form.isMoldMildewResistant,
    isScrubbable: form.isScrubbable,
    isOneCoat: form.isOneCoat,
  };
}

export function formatCustomProductMoneyOnBlur(value: string): string {
  return formatMoneyInputOnBlur(value);
}
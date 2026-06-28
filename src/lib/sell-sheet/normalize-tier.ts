import { mergePaintSystemOptionLists } from "@/lib/sell-sheet/sell-sheet-limits";
import type { SellSheetTier, SellSheetTierKey } from "@/types/sell-sheet";

export function normalizeSellSheetTier(
  tier: Partial<SellSheetTier> & { key: SellSheetTierKey },
): SellSheetTier {
  const selected = tier.paintSystemFeatures ?? [];
  const options = mergePaintSystemOptionLists(
    tier.paintSystemFeatureOptions,
    selected,
  );

  return {
    key: tier.key,
    displayName: tier.displayName ?? "",
    manufacturer: tier.manufacturer ?? "",
    paintType: tier.paintType ?? "",
    paintSystemFeatureOptions: options,
    paintSystemFeatures: selected,
    features: tier.features ?? [],
    warrantyPeriod: tier.warrantyPeriod ?? "",
    warrantyCoverage: tier.warrantyCoverage ?? "",
    paintCanImage: tier.paintCanImage?.trim() ? tier.paintCanImage.trim() : null,
  };
}
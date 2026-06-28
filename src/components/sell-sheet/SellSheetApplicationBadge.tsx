import type { SellSheetApplicationType } from "@/types/sell-sheet";

type SellSheetApplicationBadgeProps = {
  applicationType: SellSheetApplicationType | "";
  label: string | null;
};

export function SellSheetApplicationBadge({
  applicationType,
  label,
}: SellSheetApplicationBadgeProps) {
  if (!label || !applicationType) return null;

  return (
    <p
      className={`sell-sheet-application-type sell-sheet-application-type-${applicationType}`}
    >
      {label}
    </p>
  );
}
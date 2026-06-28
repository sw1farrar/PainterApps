import { Shield } from "lucide-react";
import { formatWarrantyPeriod } from "@/lib/sell-sheet/utils";

type SellSheetWarrantyDisplayProps = {
  period: string;
  coverage: string;
  heading: string;
};

export function SellSheetWarrantyDisplay({
  period,
  coverage,
  heading,
}: SellSheetWarrantyDisplayProps) {
  const periodLine = period.trim();
  if (!periodLine) return null;

  const { value, unit } = formatWarrantyPeriod(periodLine);
  const coverageLine = coverage.trim();

  return (
    <div className="sell-sheet-warranty-hero">
      <div className="sell-sheet-warranty-hero-inner">
        <div className="sell-sheet-warranty-hero-top">
          <Shield className="sell-sheet-warranty-hero-icon" aria-hidden />
          <p className="sell-sheet-warranty-hero-label">{heading}</p>
        </div>
        <div className="sell-sheet-warranty-hero-period">
          <span className="sell-sheet-warranty-hero-value">{value}</span>
          {unit ? (
            <span className="sell-sheet-warranty-hero-unit">{unit}</span>
          ) : null}
        </div>
        {coverageLine ? (
          <p className="sell-sheet-warranty-hero-coverage">{coverageLine}</p>
        ) : null}
      </div>
    </div>
  );
}
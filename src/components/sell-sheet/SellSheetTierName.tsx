import { parseTierDisplayName } from "@/lib/sell-sheet/utils";
import type { SellSheetTierKey } from "@/types/sell-sheet";

type SellSheetTierNameProps = {
  tierKey: SellSheetTierKey;
  displayName: string;
};

export function SellSheetTierName({
  tierKey,
  displayName,
}: SellSheetTierNameProps) {
  const { primary, secondary } = parseTierDisplayName(displayName);
  const isBest = tierKey === "best";

  return (
    <div className={`sell-sheet-tier-banner sell-sheet-tier-banner-${tierKey}`}>
      <span className="sell-sheet-tier-banner-accent" aria-hidden />
      <span className="sell-sheet-tier-banner-shine" aria-hidden />
      <div className="sell-sheet-tier-banner-inner">
        <h2 className="sell-sheet-tier-name">
          <span className="sell-sheet-tier-name-text">{primary}</span>
          {isBest ? (
            <span className="sell-sheet-tier-star" aria-hidden>
              ★
            </span>
          ) : null}
        </h2>
        {secondary ? (
          <p className="sell-sheet-tier-package">{secondary}</p>
        ) : null}
      </div>
    </div>
  );
}
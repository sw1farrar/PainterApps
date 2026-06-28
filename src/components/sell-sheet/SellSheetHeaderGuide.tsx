import { showSystemsGuideFlourishes } from "@/lib/sell-sheet/systems-guide-display";
import type { SellSheetApplicationType } from "@/types/sell-sheet";

type SellSheetHeaderGuideProps = {
  applicationType: SellSheetApplicationType | "";
  applicationLabel: string;
  systemsGuideLabel: string;
};

export function SellSheetHeaderGuide({
  applicationType,
  applicationLabel,
  systemsGuideLabel,
}: SellSheetHeaderGuideProps) {
  if (!applicationType || !applicationLabel) return null;

  const showFlourishes = showSystemsGuideFlourishes(applicationType);

  return (
    <div
      className={`sell-sheet-systems-guide-block sell-sheet-systems-guide-block-${applicationType}`}
    >
      {showFlourishes ? (
        <span className="sell-sheet-systems-guide-flourish" aria-hidden>
          <span className="sell-sheet-systems-guide-flourish-line" />
          <span className="sell-sheet-systems-guide-flourish-gem" />
        </span>
      ) : null}
      <div className="sell-sheet-systems-guide-plaque">
        <span className="sell-sheet-systems-guide-plaque-shine" aria-hidden />
        <p className="sell-sheet-systems-guide-application">{applicationLabel}</p>
        <p className="sell-sheet-systems-guide">{systemsGuideLabel}</p>
      </div>
      {showFlourishes ? (
        <span
          className="sell-sheet-systems-guide-flourish sell-sheet-systems-guide-flourish-mirror"
          aria-hidden
        >
          <span className="sell-sheet-systems-guide-flourish-gem" />
          <span className="sell-sheet-systems-guide-flourish-line" />
        </span>
      ) : null}
    </div>
  );
}
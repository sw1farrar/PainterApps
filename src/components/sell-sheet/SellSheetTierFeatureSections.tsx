import { Droplets, Sparkles } from "lucide-react";
import { SellSheetFeatureList } from "@/components/sell-sheet/SellSheetFeatureList";
import { benefitsForDisplay } from "@/lib/sell-sheet/sell-sheet-limits";
import { paintSystemDisplaySlots } from "@/lib/sell-sheet/paint-system-features";

type SellSheetTierFeatureSectionsProps = {
  paintSystemFeatures: string[];
  packageFeatures: string[];
  paintSystemHeading: string;
  benefitsHeading: string;
  tierKey: string;
};

export function SellSheetTierFeatureSections({
  paintSystemFeatures,
  packageFeatures,
  paintSystemHeading,
  benefitsHeading,
  tierKey,
}: SellSheetTierFeatureSectionsProps) {
  const hasBenefits = benefitsForDisplay(packageFeatures).length > 0;

  return (
    <div className="sell-sheet-tier-features">
      <section className="sell-sheet-paint-system">
        <div className="sell-sheet-section-head">
          <span className="sell-sheet-paint-system-icon" aria-hidden>
            <Droplets strokeWidth={2.25} />
          </span>
          <h3 className="sell-sheet-paint-system-title">{paintSystemHeading}</h3>
        </div>
        <ul className="sell-sheet-paint-system-list">
          {paintSystemDisplaySlots(paintSystemFeatures).map((feature, index) => (
            <li
              key={`${tierKey}-paint-${index}-${feature || "slot"}`}
              className={`sell-sheet-paint-system-item${feature ? "" : " sell-sheet-paint-system-item-placeholder"}`}
              aria-hidden={feature ? undefined : true}
            >
              {feature ? (
                <>
                  <span className="sell-sheet-paint-system-marker" aria-hidden />
                  <span className="sell-sheet-paint-system-text">{feature}</span>
                </>
              ) : (
                <span className="sell-sheet-paint-system-text">&nbsp;</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {hasBenefits ? (
        <div className="sell-sheet-features-divider" aria-hidden />
      ) : null}

      {hasBenefits ? (
        <section className="sell-sheet-benefits">
          <div className="sell-sheet-benefits-heading">
            <span className="sell-sheet-benefits-heading-line" aria-hidden />
            <div className="sell-sheet-benefits-heading-label">
              <Sparkles
                className="sell-sheet-benefits-heading-icon"
                strokeWidth={2.25}
                aria-hidden
              />
              <h3 className="sell-sheet-benefits-title">{benefitsHeading}</h3>
            </div>
            <span className="sell-sheet-benefits-heading-line" aria-hidden />
          </div>
          <SellSheetFeatureList
            features={packageFeatures}
            heading=""
            tierKey={tierKey}
            hideHeading
            variant="benefits"
          />
        </section>
      ) : null}
    </div>
  );
}
import { Check } from "lucide-react";
import { benefitsForDisplay } from "@/lib/sell-sheet/sell-sheet-limits";

type SellSheetFeatureListProps = {
  features: string[];
  heading: string;
  tierKey: string;
  hideHeading?: boolean;
  variant?: "default" | "benefits";
};

export function SellSheetFeatureList({
  features,
  heading,
  tierKey,
  hideHeading = false,
  variant = "default",
}: SellSheetFeatureListProps) {
  const displayFeatures = benefitsForDisplay(features);
  if (displayFeatures.length === 0) return null;

  const rootClass =
    variant === "benefits"
      ? "sell-sheet-features sell-sheet-features-embedded"
      : "sell-sheet-features";

  return (
    <div className={rootClass}>
      {!hideHeading && heading ? (
        <p className="sell-sheet-features-title">{heading}</p>
      ) : null}
      <ul className="sell-sheet-feature-list">
        {displayFeatures.map((feature, index) => (
          <li
            key={`${tierKey}-${index}-${feature}`}
            className="sell-sheet-feature"
          >
            <span className="sell-sheet-feature-marker" aria-hidden>
              <Check strokeWidth={3} />
            </span>
            <span className="sell-sheet-feature-text">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
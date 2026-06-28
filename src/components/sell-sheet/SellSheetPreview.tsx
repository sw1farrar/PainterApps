import { SellSheetHeaderGuide } from "@/components/sell-sheet/SellSheetHeaderGuide";
import { SellSheetTierName } from "@/components/sell-sheet/SellSheetTierName";
import { sellSheetDisplayStyle } from "@/lib/sell-sheet/display-tokens";
import { sellSheetApplicationSystemLabel, type SellSheetApplicationLabels } from "@/lib/sell-sheet/utils";
import { SellSheetLogo } from "@/components/sell-sheet/SellSheetLogo";
import { SellSheetTierFeatureSections } from "@/components/sell-sheet/SellSheetTierFeatureSections";
import { SellSheetWarrantyDisplay } from "@/components/sell-sheet/SellSheetWarrantyDisplay";
import type { SellSheetData } from "@/types/sell-sheet";

type SellSheetPreviewProps = {
  data: SellSheetData;
  paintSystemHeading: string;
  benefitsHeading: string;
  warrantyHeading: string;
  applicationLabels: SellSheetApplicationLabels;
  systemsGuideLabel: string;
  preparedByFooter: string;
  className?: string;
};

export function SellSheetPreview({
  data,
  paintSystemHeading,
  benefitsHeading,
  warrantyHeading,
  applicationLabels,
  systemsGuideLabel,
  preparedByFooter,
  className = "",
}: SellSheetPreviewProps) {
  const applicationLabel = sellSheetApplicationSystemLabel(
    data.applicationType,
    applicationLabels,
  );

  return (
    <div
      className={`sell-sheet-page ${className}`.trim()}
      style={sellSheetDisplayStyle()}
    >
      <article className="sell-sheet-document" aria-label="Sell sheet preview">
      <header className="sell-sheet-header">
        <div className="sell-sheet-header-logo">
          <div className="sell-sheet-logo-wrap">
            {data.logoImage ? (
              <SellSheetLogo
                src={data.logoImage}
                className="sell-sheet-logo"
              />
            ) : (
              <div className="sell-sheet-logo-placeholder" aria-hidden />
            )}
          </div>
        </div>
        {applicationLabel ? (
          <div className="sell-sheet-header-guide">
            <SellSheetHeaderGuide
              applicationType={data.applicationType}
              applicationLabel={applicationLabel}
              systemsGuideLabel={systemsGuideLabel}
            />
          </div>
        ) : null}
      </header>

      <div className="sell-sheet-grid">
        {data.tiers.map((tier) => {
          const isBest = tier.key === "best";

          return (
            <section
              key={tier.key}
              className={`sell-sheet-column ${isBest ? "sell-sheet-column-best" : ""}`}
            >
              <div className="sell-sheet-tier-head">
                <SellSheetTierName
                  tierKey={tier.key}
                  displayName={tier.displayName}
                />
                <div className="sell-sheet-can-wrap">
                  {tier.paintCanImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tier.paintCanImage}
                      alt=""
                      className="sell-sheet-can"
                    />
                  ) : (
                    <div className="sell-sheet-can-placeholder" aria-hidden />
                  )}
                </div>
              </div>

              {tier.manufacturer.trim() ? (
                <p className="sell-sheet-manufacturer">{tier.manufacturer}</p>
              ) : null}
              {tier.paintType.trim() ? (
                <p className="sell-sheet-paint-type">{tier.paintType}</p>
              ) : null}

              <SellSheetWarrantyDisplay
                period={tier.warrantyPeriod}
                coverage={tier.warrantyCoverage}
                heading={warrantyHeading}
              />

              <SellSheetTierFeatureSections
                paintSystemFeatures={tier.paintSystemFeatures ?? []}
                packageFeatures={tier.features}
                paintSystemHeading={paintSystemHeading}
                benefitsHeading={benefitsHeading}
                tierKey={tier.key}
              />
            </section>
          );
        })}
      </div>

      <footer className="sell-sheet-footer">
        <p>{preparedByFooter}</p>
      </footer>
      </article>
    </div>
  );
}
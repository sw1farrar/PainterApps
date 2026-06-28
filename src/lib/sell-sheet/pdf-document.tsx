import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  PdfCheckIcon,
  PdfPaintSystemIcon,
  PdfShieldIcon,
  PdfSparklesIcon,
} from "@/lib/sell-sheet/pdf-icons";
import { SELL_SHEET_COLORS } from "@/lib/sell-sheet/display-tokens";
import { SS_PDF_LAYOUT } from "@/lib/sell-sheet/pdf-layout";
import { PdfSellSheetTierBanner } from "@/lib/sell-sheet/pdf-tier-banner";
import { benefitsForDisplay } from "@/lib/sell-sheet/sell-sheet-limits";
import {
  formatWarrantyPeriod,
  parseTierDisplayName,
  sellSheetApplicationSystemLabel,
  type SellSheetApplicationLabels,
} from "@/lib/sell-sheet/utils";
import { paintSystemDisplaySlots } from "@/lib/sell-sheet/paint-system-features";
import {
  showSystemsGuideFlourishes,
  SYSTEMS_GUIDE_COLORS,
} from "@/lib/sell-sheet/systems-guide-display";
import type { SellSheetData } from "@/types/sell-sheet";

const L = SS_PDF_LAYOUT;
const C = SELL_SHEET_COLORS;

const paintSystemMinHeight =
  L.paintSystem.paddingVertical * 2 +
  L.paintSystem.sectionHeadMarginBottom +
  L.paintSystem.iconCircle +
  L.paintSystem.listGap +
  L.paintSystem.rowHeight * 2;

const styles = StyleSheet.create({
  page: {
    width: L.page.width,
    height: L.page.height,
    flexDirection: "column",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.navy900,
    backgroundColor: C.white,
  },
  header: {
    flexShrink: 0,
    paddingTop: L.header.paddingTop,
    paddingHorizontal: L.header.paddingHorizontal,
    paddingBottom: L.header.paddingBottom,
    minHeight: L.header.minHeight,
    borderBottomWidth: L.header.borderBottom,
    borderBottomColor: C.blue500,
    backgroundColor: L.header.background,
  },
  headerLayout: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: L.header.minHeight - L.header.paddingTop - L.header.paddingBottom,
    gap: L.header.columnGap,
  },
  headerLogo: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerAside: {
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    minHeight:
      L.header.minHeight - L.header.paddingTop - L.header.paddingBottom,
  },
  systemsGuideBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: L.systemsGuide.flourishGap,
    maxWidth: L.systemsGuide.blockMaxWidth,
  },
  systemsGuideBlockPlaqueOnly: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  systemsGuideFlourish: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: L.systemsGuide.flourishMinWidth,
    gap: L.systemsGuide.flourishGap * 0.55,
  },
  systemsGuideFlourishLine: {
    flex: 1,
    height: 2,
    backgroundColor: SYSTEMS_GUIDE_COLORS.flourishLine,
    borderRadius: 1,
  },
  systemsGuideFlourishGem: {
    width: L.systemsGuide.gemSize,
    height: L.systemsGuide.gemSize,
    backgroundColor: SYSTEMS_GUIDE_COLORS.flourishGem,
    borderRadius: 1,
    transform: "rotate(45deg)",
  },
  systemsGuidePlaque: {
    position: "relative",
    paddingTop: L.systemsGuide.plaquePaddingTop,
    paddingBottom: L.systemsGuide.plaquePaddingBottom,
    paddingHorizontal: L.systemsGuide.plaquePaddingHorizontal,
    borderRadius: 3,
    backgroundColor: SYSTEMS_GUIDE_COLORS.plaqueBackground,
    borderWidth: 1,
    borderColor: SYSTEMS_GUIDE_COLORS.plaqueBorder,
    alignItems: "center",
  },
  systemsGuidePlaqueAccent: {
    position: "absolute",
    top: 0,
    left: "12%",
    right: "12%",
    height: 2,
    backgroundColor: SYSTEMS_GUIDE_COLORS.plaqueAccent,
    borderRadius: 1,
  },
  systemsGuideApplication: {
    fontSize: L.systemsGuide.applicationSize,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: L.systemsGuide.applicationLetterSpacing,
    color: SYSTEMS_GUIDE_COLORS.application,
    textAlign: "center",
    marginBottom: L.systemsGuide.applicationMarginBottom,
  },
  systemsGuide: {
    fontSize: L.systemsGuide.titleSize,
    fontWeight: "bold",
    color: SYSTEMS_GUIDE_COLORS.title,
    letterSpacing: L.systemsGuide.titleLetterSpacing,
    textAlign: "center",
    textTransform: "capitalize",
  },
  grid: {
    flexDirection: "row",
    flex: 1,
    minHeight: 0,
  },
  column: {
    flex: 1,
    flexDirection: "column",
    paddingBottom: L.column.paddingBottom,
    borderRightWidth: 1,
    borderRightColor: C.border,
    backgroundColor: C.white,
  },
  columnBody: {
    flex: 1,
    flexDirection: "column",
    paddingHorizontal: L.column.paddingHorizontal,
    minHeight: 0,
  },
  columnLast: {
    borderRightWidth: 0,
  },
  columnBest: {
    backgroundColor: C.columnBestBackground,
    borderRightWidth: 2,
    borderLeftWidth: 2,
    borderLeftColor: C.columnBestBorder,
    borderRightColor: C.columnBestBorder,
  },
  tierHead: {
    alignItems: "center",
    gap: L.tierHead.gap,
    marginBottom: L.tierHead.marginBottom,
    paddingBottom: L.tierHead.paddingBottom,
    borderBottomWidth: 1,
    borderBottomColor: C.tierHeadBorder,
  },
  canWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: L.canWrap.minHeight,
    paddingVertical: L.canWrap.paddingVertical,
    paddingHorizontal: L.canWrap.paddingHorizontal,
    backgroundColor: C.white,
    borderRadius: 3,
  },
  can: {
    width: "100%",
    maxHeight: L.canWrap.maxImageHeight,
    objectFit: "contain",
    objectPosition: "center bottom",
    backgroundColor: C.white,
  },
  manufacturer: {
    fontSize: L.meta.manufacturer,
    fontWeight: "bold",
    textAlign: "center",
    color: C.navy900,
    lineHeight: 1.25,
  },
  paintType: {
    fontSize: L.meta.paintType,
    textAlign: "center",
    color: C.silver600,
    marginTop: L.tierHead.gap * 0.35,
    fontStyle: "italic",
    lineHeight: 1.25,
  },
  tierFeatures: {
    marginTop: 0,
    flex: 1,
    flexDirection: "column",
    gap: L.tierFeaturesGap,
  },
  warrantyHero: {
    marginTop: L.warranty.marginTop,
    marginBottom: L.warranty.marginBottom,
    flexShrink: 0,
  },
  warrantyHeroInner: {
    alignItems: "center",
    paddingVertical: L.warranty.paddingVertical,
    paddingHorizontal: L.warranty.paddingHorizontal,
    borderRadius: 3,
    backgroundColor: C.warrantyBackground,
    borderWidth: 1,
    borderColor: C.warrantyBorder,
  },
  warrantyHeroInnerBest: {
    borderColor: C.warrantyBorderBest,
    backgroundColor: C.warrantyBackgroundBest,
  },
  warrantyHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: L.warranty.marginTop,
    marginBottom: L.warranty.marginTop * 0.65,
  },
  warrantyHeroLabel: {
    fontSize: L.warranty.label,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    color: C.blue600,
    textAlign: "center",
  },
  warrantyHeroPeriodRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: L.warranty.marginTop * 0.75,
  },
  warrantyHeroValue: {
    fontSize: L.warranty.value,
    fontWeight: "bold",
    color: C.navy900,
    lineHeight: 1,
  },
  warrantyHeroUnit: {
    fontSize: L.warranty.unit,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: C.blue600,
  },
  warrantyHeroCoverage: {
    fontSize: L.warranty.coverage,
    fontWeight: "bold",
    color: C.silver600,
    textAlign: "center",
    marginTop: L.warranty.marginTop * 0.75,
    lineHeight: 1.3,
  },
  paintSystemSection: {
    flexShrink: 0,
    paddingVertical: L.paintSystem.paddingVertical,
    paddingHorizontal: L.paintSystem.paddingHorizontal,
    borderRadius: 3,
    backgroundColor: C.paintSystemBackground,
    borderWidth: 1,
    borderColor: C.paintSystemBorder,
    minHeight: paintSystemMinHeight,
  },
  paintSystemHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: L.paintSystem.sectionHeadGap,
    marginBottom: L.paintSystem.sectionHeadMarginBottom,
  },
  paintSystemTitle: {
    fontSize: L.paintSystem.title,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: C.blue600,
    lineHeight: 1.2,
  },
  paintSystemList: {
    gap: L.paintSystem.listGap,
  },
  paintSystemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: L.paintSystem.sectionHeadGap,
    minHeight: L.paintSystem.rowHeight,
    height: L.paintSystem.rowHeight,
  },
  paintSystemRowPlaceholder: {
    opacity: 0,
  },
  paintSystemBullet: {
    width: L.paintSystem.marker,
    height: L.paintSystem.marker,
    marginTop: L.paintSystem.markerMarginTop,
    backgroundColor: C.blue500,
    transform: "rotate(45deg)",
    borderRadius: 1,
  },
  paintSystemText: {
    flex: 1,
    fontSize: L.paintSystem.feature,
    color: C.navy800,
    lineHeight: 1.38,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: C.sectionDivider,
    marginVertical: L.benefits.dividerMarginVertical,
    marginHorizontal: L.benefits.dividerMarginHorizontal,
  },
  benefitsSection: {
    paddingVertical: L.benefits.paddingVertical,
    paddingHorizontal: L.benefits.paddingHorizontal,
  },
  benefitsHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: L.benefits.headingGap,
    marginBottom: L.benefits.headingMarginBottom,
  },
  benefitsHeadingLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.benefitsHeadingLine,
  },
  benefitsHeadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: L.benefits.headingGap * 0.65,
    flexShrink: 0,
    paddingVertical: L.benefits.pillPaddingVertical,
    paddingHorizontal: L.benefits.pillPaddingHorizontal,
    borderRadius: 999,
    backgroundColor: C.benefitsPillBackground,
    borderWidth: 1,
    borderColor: C.benefitsPillBorder,
  },
  benefitsTitle: {
    fontSize: L.benefits.title,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: C.silver600,
    lineHeight: 1.15,
  },
  featureList: {
    gap: L.benefits.featureGap,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: L.benefits.headingGap,
  },
  featureBullet: {
    width: L.feature.marker,
    height: L.feature.marker,
    borderRadius: L.feature.marker / 2,
    backgroundColor: C.blue500,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontSize: L.feature.fontSize,
    color: C.navy800,
    lineHeight: L.feature.lineHeight,
  },
  footer: {
    flexShrink: 0,
    paddingVertical: L.footer.paddingVertical,
    paddingHorizontal: L.footer.paddingHorizontal,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.footerBackground,
    textAlign: "center",
    fontSize: L.footer.fontSize,
    color: C.silver500,
  },
});

export type SellSheetPdfLabels = {
  paintSystemHeading: string;
  benefitsHeading: string;
  warrantyHeading: string;
  systemsGuide: string;
  applicationLabels: SellSheetApplicationLabels;
  preparedByFooter: string;
};

function PdfFeatureLine({ feature }: { feature: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureBullet}>
        <PdfCheckIcon />
      </View>
      <Text style={styles.featureText}>{feature}</Text>
    </View>
  );
}

function PdfPaintSystemLine({ feature }: { feature: string }) {
  return (
    <View style={styles.paintSystemRow}>
      <View style={styles.paintSystemBullet} />
      <Text style={styles.paintSystemText}>{feature}</Text>
    </View>
  );
}

export function SellSheetPdfDocument({
  data,
  labels,
  logoSize,
}: {
  data: SellSheetData;
  labels: SellSheetPdfLabels;
  logoSize?: { width: number; height: number; objectFit?: "contain" };
}) {
  const footerText = labels.preparedByFooter;
  const applicationLabel = sellSheetApplicationSystemLabel(
    data.applicationType,
    labels.applicationLabels,
  );
  const resolvedLogoSize = logoSize ?? {
    width: L.logo.maxWidth,
    height: L.logo.maxHeight,
  };
  const systemsGuideFlourishes = showSystemsGuideFlourishes(data.applicationType);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLayout}>
            <View style={styles.headerLogo}>
              {data.logoImage ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image
                  src={data.logoImage}
                  style={{
                    objectFit: "contain",
                    ...resolvedLogoSize,
                  }}
                />
              ) : null}
            </View>
            {applicationLabel ? (
              <View style={styles.headerAside}>
                <View
                  style={
                    systemsGuideFlourishes
                      ? styles.systemsGuideBlock
                      : styles.systemsGuideBlockPlaqueOnly
                  }
                >
                  {systemsGuideFlourishes ? (
                    <View style={styles.systemsGuideFlourish}>
                      <View style={styles.systemsGuideFlourishLine} />
                      <View style={styles.systemsGuideFlourishGem} />
                    </View>
                  ) : null}
                  <View style={styles.systemsGuidePlaque}>
                    <View style={styles.systemsGuidePlaqueAccent} />
                    <Text style={styles.systemsGuideApplication}>
                      {applicationLabel}
                    </Text>
                    <Text style={styles.systemsGuide}>
                      {labels.systemsGuide}
                    </Text>
                  </View>
                  {systemsGuideFlourishes ? (
                    <View style={styles.systemsGuideFlourish}>
                      <View style={styles.systemsGuideFlourishGem} />
                      <View style={styles.systemsGuideFlourishLine} />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.grid}>
          {data.tiers.map((tier, tierIndex) => {
            const isBest = tier.key === "best";
            const isLast = tierIndex === data.tiers.length - 1;
            const { primary, secondary } = parseTierDisplayName(tier.displayName);
            const paintSystemFeatures = tier.paintSystemFeatures ?? [];
            const displayFeatures = benefitsForDisplay(tier.features);
            const hasBenefits = displayFeatures.length > 0;
            const warrantyPeriod = tier.warrantyPeriod.trim();
            const { value, unit } = formatWarrantyPeriod(warrantyPeriod);
            const warrantyCoverage = tier.warrantyCoverage.trim();

            return (
              <View
                key={tier.key}
                style={[
                  styles.column,
                  isLast ? styles.columnLast : {},
                  isBest ? styles.columnBest : {},
                ]}
              >
                <View style={styles.tierHead}>
                  <PdfSellSheetTierBanner
                    tierKey={tier.key}
                    primary={primary}
                    secondary={secondary}
                  />
                  <View style={styles.canWrap}>
                    {tier.paintCanImage ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <Image src={tier.paintCanImage} style={styles.can} />
                    ) : null}
                  </View>
                </View>
                <View style={styles.columnBody}>
                  {tier.manufacturer.trim() ? (
                    <Text style={styles.manufacturer}>{tier.manufacturer}</Text>
                  ) : null}
                  {tier.paintType.trim() ? (
                    <Text style={styles.paintType}>{tier.paintType}</Text>
                  ) : null}

                  {warrantyPeriod ? (
                  <View style={styles.warrantyHero}>
                    <View
                      style={[
                        styles.warrantyHeroInner,
                        isBest ? styles.warrantyHeroInnerBest : {},
                      ]}
                    >
                      <View style={styles.warrantyHeroTop}>
                        <PdfShieldIcon />
                        <Text style={styles.warrantyHeroLabel}>
                          {labels.warrantyHeading}
                        </Text>
                      </View>
                      <View style={styles.warrantyHeroPeriodRow}>
                        <Text style={styles.warrantyHeroValue}>{value}</Text>
                        {unit ? (
                          <Text style={styles.warrantyHeroUnit}>{unit}</Text>
                        ) : null}
                      </View>
                      {warrantyCoverage ? (
                        <Text style={styles.warrantyHeroCoverage}>
                          {warrantyCoverage}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <View style={styles.tierFeatures}>
                  <View style={styles.paintSystemSection}>
                    <View style={styles.paintSystemHead}>
                      <PdfPaintSystemIcon />
                      <Text style={styles.paintSystemTitle}>
                        {labels.paintSystemHeading}
                      </Text>
                    </View>
                    <View style={styles.paintSystemList}>
                      {paintSystemDisplaySlots(paintSystemFeatures).map(
                        (feature, index) =>
                          feature ? (
                            <PdfPaintSystemLine
                              key={`${tier.key}-paint-${index}`}
                              feature={feature}
                            />
                          ) : (
                            <View
                              key={`${tier.key}-paint-slot-${index}`}
                              style={[
                                styles.paintSystemRow,
                                styles.paintSystemRowPlaceholder,
                              ]}
                            >
                              <Text style={styles.paintSystemText}> </Text>
                            </View>
                          ),
                      )}
                    </View>
                  </View>

                  {hasBenefits ? (
                    <View style={styles.sectionDivider} />
                  ) : null}

                  {hasBenefits ? (
                    <View style={styles.benefitsSection}>
                      <View style={styles.benefitsHeadingRow}>
                        <View style={styles.benefitsHeadingLine} />
                        <View style={styles.benefitsHeadingPill}>
                          <PdfSparklesIcon />
                          <Text style={styles.benefitsTitle}>
                            {labels.benefitsHeading}
                          </Text>
                        </View>
                        <View style={styles.benefitsHeadingLine} />
                      </View>
                      <View style={styles.featureList}>
                        {displayFeatures.map((feature, index) => (
                          <PdfFeatureLine
                            key={`${tier.key}-${index}`}
                            feature={feature}
                          />
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>{footerText}</Text>
      </Page>
    </Document>
  );
}
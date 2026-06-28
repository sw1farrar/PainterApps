import type { CSSProperties } from "react";
import type { SellSheetApplicationType, SellSheetTierKey } from "@/types/sell-sheet";

/** Single source of truth for sell-sheet web preview + PDF export. */
export const SELL_SHEET_PAGE = {
  widthIn: 8.5,
  heightIn: 11,
} as const;

export const SELL_SHEET_FONT_PT = {
  systemsGuide: 23,
  tier: 16,
  metaBold: 10.5,
  meta: 10,
  featuresTitle: 8.5,
  feature: 10,
  warrantyLabel: 6.5,
  warrantyValue: 15,
  warrantyUnit: 7,
  warrantyCoverage: 7,
  footer: 8.5,
  tierPackage: 8.8,
  systemsGuideApplication: 9.2,
} as const;

export const SELL_SHEET_PDF_FONT_FAMILY = "Source Sans 3" as const;

export const TIER_BANNER_TYPOGRAPHY = {
  nameLetterSpacingEm: 0.11,
  nameLineHeight: 1.08,
  packageLetterSpacingEm: 0.03,
  packageLineHeight: 1.2,
  starSizeEm: 0.78,
  accentOpacity: 0.55,
  borderOpacity: 0.55,
} as const;

export type TierBannerGradientStop = {
  offset: string;
  color: string;
};

/** Matches globals.css tier-banner linear-gradient stops. */
export const TIER_BANNER_GRADIENTS: Record<
  SellSheetTierKey,
  { angle: number; stops: TierBannerGradientStop[] }
> = {
  good: {
    angle: 180,
    stops: [
      { offset: "0%", color: "#f8fafc" },
      { offset: "55%", color: "#edf1f5" },
      { offset: "100%", color: "#e7edf3" },
    ],
  },
  better: {
    angle: 180,
    stops: [
      { offset: "0%", color: "#f5faff" },
      { offset: "52%", color: "#eaf3fc" },
      { offset: "100%", color: "#dcecff" },
    ],
  },
  best: {
    angle: 135,
    stops: [
      { offset: "0%", color: "#fff9f0" },
      { offset: "46%", color: "#f0f7ff" },
      { offset: "100%", color: "#e3efff" },
    ],
  },
};

export const TIER_BANNER_SHINE = {
  angle: 168,
  stops: [
    { offset: "0%", color: "rgba(255, 255, 255, 0.5)" },
    { offset: "42%", color: "rgba(255, 255, 255, 0)" },
  ],
} as const;

export const SELL_SHEET_LAYOUT_IN = {
  headerPaddingTop: 0.14,
  headerPaddingHorizontal: 0.32,
  headerPaddingBottom: 0.18,
  headerMinHeight: 1.12,
  headerColumnGap: 0.22,
  logoMaxWidth: 2,
  logoMaxHeight: 0.95,
  columnPaddingTop: 0.16,
  columnPaddingHorizontal: 0.14,
  columnPaddingBottom: 0.14,
  tierHeadGap: 0.06,
  tierHeadMarginBottom: 0.08,
  tierHeadPaddingBottom: 0.08,
  tierBannerPaddingTop: 0.1,
  tierBannerPaddingBottom: 0.09,
  tierBannerPaddingHorizontal: 0.12,
  tierBannerInnerGap: 0.03,
  tierBannerNameRowGap: 0.05,
  canWrapMinHeight: 1.85,
  canWrapPaddingVertical: 0.1,
  canWrapPaddingHorizontal: 0.08,
  canMaxHeight: 1.8,
  paintSystemLineHeight: 1.38,
  paintSystemLines: 2,
  paintSystemListGap: 0.05,
  paintSystemPaddingVertical: 0.08,
  paintSystemPaddingHorizontal: 0.07,
  paintSystemSectionHeadGap: 0.05,
  paintSystemSectionHeadMarginBottom: 0.06,
  systemsGuideBlockMaxWidth: 3.55,
  systemsGuideFlourishGap: 0.09,
  systemsGuideFlourishMinWidth: 0.38,
  systemsGuidePlaquePaddingTop: 0.08,
  systemsGuidePlaquePaddingBottom: 0.11,
  systemsGuidePlaquePaddingHorizontal: 0.28,
  systemsGuideApplicationMarginBottom: 0.045,
  warrantyMarginTop: 0.04,
  warrantyMarginBottom: 0.06,
  warrantyPaddingVertical: 0.05,
  warrantyPaddingHorizontal: 0.08,
  benefitsPaddingVertical: 0.05,
  benefitsPaddingHorizontal: 0.04,
  benefitsHeadingGap: 0.07,
  benefitsHeadingMarginBottom: 0.08,
  benefitsFeatureGap: 0.06,
  tierFeaturesGap: 0.08,
  footerPaddingVertical: 0.1,
  footerPaddingHorizontal: 0.2,
} as const;

export const SELL_SHEET_COLORS = {
  white: "#ffffff",
  navy900: "#0a1428",
  navy800: "#0f1e38",
  blue500: "#2b6cb8",
  blue600: "#1e5a9e",
  blue700: "#1a4570",
  silver500: "#8d9aad",
  silver600: "#6a7889",
  border: "#d4dbe4",
  headerBackground: "#f4f8fc",
  columnBestBackground: "#eef6ff",
  columnBestBorder: "#c5d9ef",
  tierHeadBorder: "#d8dee6",
  footerBackground: "#f8fafc",
  warrantyBackground: "#eef6ff",
  warrantyBackgroundBest: "#edf5ff",
  warrantyBorder: "#c5d9ef",
  warrantyBorderBest: "#b8d4ef",
  paintSystemBackground: "#f3f8fd",
  paintSystemBorder: "#dce9f5",
  sectionDivider: "#c5d9ef",
  benefitsHeadingLine: "#b8c2ce",
  benefitsPillBackground: "#f8fafc",
  benefitsPillBorder: "#c5ced8",
} as const;

export const SYSTEMS_GUIDE_COLORS = {
  application: SELL_SHEET_COLORS.blue600,
  title: SELL_SHEET_COLORS.blue700,
  plaqueBackground: "#f4faff",
  plaqueBorder: "#c5d9ef",
  plaqueAccent: "#4a90d9",
  flourishLine: "#8eb8dc",
  flourishGem: SELL_SHEET_COLORS.blue500,
} as const;

export const TIER_BANNER_COLORS: Record<
  SellSheetTierKey,
  {
    text: string;
    package: string;
    background: string;
    border: string;
    accent: string;
    star: string;
  }
> = {
  good: {
    text: "#3a4656",
    package: SELL_SHEET_COLORS.silver600,
    background: "#edf1f5",
    border: "#c5ced8",
    accent: SELL_SHEET_COLORS.silver500,
    star: SELL_SHEET_COLORS.silver500,
  },
  better: {
    text: "#123d66",
    package: "#4f5c6c",
    background: "#eaf3fc",
    border: "#9ec5f0",
    accent: "#4a90d9",
    star: "#4a90d9",
  },
  best: {
    text: "#082038",
    package: SELL_SHEET_COLORS.blue600,
    background: "#f0f7ff",
    border: SELL_SHEET_COLORS.blue500,
    accent: "#4a90d9",
    star: "#c4802c",
  },
};

export function tierBannerBorderColor(tierKey: SellSheetTierKey): string {
  const hex = TIER_BANNER_COLORS[tierKey].border;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${TIER_BANNER_TYPOGRAPHY.borderOpacity})`;
}

/** CSS linear-gradient angle → SVG linearGradient vector (percent strings). */
export function cssGradientToSvgCoords(angleDeg: number) {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  const x1 = 50 - Math.cos(radians) * 50;
  const y1 = 50 - Math.sin(radians) * 50;
  const x2 = 50 + Math.cos(radians) * 50;
  const y2 = 50 + Math.sin(radians) * 50;

  return {
    x1: `${x1}%`,
    y1: `${y1}%`,
    x2: `${x2}%`,
    y2: `${y2}%`,
  };
}

export function showSystemsGuideFlourishes(
  applicationType: SellSheetApplicationType | "",
): boolean {
  return applicationType === "interior";
}

const inVar = (value: number) => `${value}in`;
const ptVar = (value: number) => `${value}pt`;

/** Layout CSS vars globals.css must reference (enforced by verify:sell-sheet). */
export const SELL_SHEET_STRUCTURE_CSS_VARS = [
  "--ss-page-width",
  "--ss-page-height",
  "--ss-header-padding-top",
  "--ss-header-padding-horizontal",
  "--ss-header-padding-bottom",
  "--ss-header-min-height",
  "--ss-header-column-gap",
  "--ss-logo-max-width",
  "--ss-logo-max-height",
  "--ss-column-padding-top",
  "--ss-column-padding-horizontal",
  "--ss-column-padding-bottom",
  "--ss-tier-head-gap",
  "--ss-tier-head-margin-bottom",
  "--ss-tier-head-padding-bottom",
  "--ss-tier-banner-padding-top",
  "--ss-tier-banner-padding-bottom",
  "--ss-tier-banner-padding-horizontal",
  "--ss-systems-guide-block-max-width",
  "--ss-systems-guide-flourish-gap",
  "--ss-systems-guide-flourish-min-width",
  "--ss-systems-guide-plaque-padding-top",
  "--ss-systems-guide-plaque-padding-bottom",
  "--ss-systems-guide-plaque-padding-horizontal",
  "--ss-systems-guide-application-margin-bottom",
  "--ss-can-wrap-min-height",
  "--ss-can-wrap-padding-vertical",
  "--ss-can-wrap-padding-horizontal",
  "--ss-can-max-height",
  "--ss-tier-features-gap",
  "--ss-paint-system-padding-vertical",
  "--ss-paint-system-padding-horizontal",
  "--ss-paint-system-section-head-gap",
  "--ss-paint-system-section-head-margin-bottom",
  "--ss-paint-system-list-gap",
  "--ss-warranty-margin-top",
  "--ss-warranty-margin-bottom",
  "--ss-warranty-padding-vertical",
  "--ss-warranty-padding-horizontal",
  "--ss-benefits-padding-vertical",
  "--ss-benefits-padding-horizontal",
  "--ss-benefits-heading-gap",
  "--ss-benefits-heading-margin-bottom",
  "--ss-benefits-feature-gap",
  "--ss-features-divider-margin-vertical",
  "--ss-features-divider-margin-horizontal",
  "--ss-footer-padding-vertical",
  "--ss-footer-padding-horizontal",
] as const;

/** Injected on `.sell-sheet-page` so web preview shares PDF dimensions & colors. */
export function sellSheetDisplayStyle(): CSSProperties {
  const L = SELL_SHEET_LAYOUT_IN;
  const F = SELL_SHEET_FONT_PT;
  const C = SELL_SHEET_COLORS;
  const TB = TIER_BANNER_COLORS;

  return {
    "--ss-page-width": inVar(SELL_SHEET_PAGE.widthIn),
    "--ss-page-height": inVar(SELL_SHEET_PAGE.heightIn),
    "--ss-systems-guide": ptVar(F.systemsGuide),
    "--ss-systems-guide-application": ptVar(F.systemsGuideApplication),
    "--ss-tier": ptVar(F.tier),
    "--ss-tier-package": ptVar(F.tierPackage),
    "--ss-tier-star": ptVar(F.tier * TIER_BANNER_TYPOGRAPHY.starSizeEm),
    "--ss-tier-banner-inner-gap": inVar(L.tierBannerInnerGap),
    "--ss-tier-banner-name-row-gap": inVar(L.tierBannerNameRowGap),
    "--ss-tier-name-letter-spacing": `${TIER_BANNER_TYPOGRAPHY.nameLetterSpacingEm}em`,
    "--ss-tier-package-letter-spacing": `${TIER_BANNER_TYPOGRAPHY.packageLetterSpacingEm}em`,
    "--ss-meta-bold": ptVar(F.metaBold),
    "--ss-meta": ptVar(F.meta),
    "--ss-features-title": ptVar(F.featuresTitle),
    "--ss-feature": ptVar(F.feature),
    "--ss-warranty-label": ptVar(F.warrantyLabel),
    "--ss-warranty-value": ptVar(F.warrantyValue),
    "--ss-warranty-unit": ptVar(F.warrantyUnit),
    "--ss-warranty-coverage": ptVar(F.warrantyCoverage),
    "--ss-footer": ptVar(F.footer),
    "--ss-paint-system-line-height": String(L.paintSystemLineHeight),
    "--ss-paint-system-lines": String(L.paintSystemLines),
    "--ss-header-padding-top": inVar(L.headerPaddingTop),
    "--ss-header-padding-horizontal": inVar(L.headerPaddingHorizontal),
    "--ss-header-padding-bottom": inVar(L.headerPaddingBottom),
    "--ss-header-min-height": inVar(L.headerMinHeight),
    "--ss-header-column-gap": inVar(L.headerColumnGap),
    "--ss-logo-max-width": inVar(L.logoMaxWidth),
    "--ss-logo-max-height": inVar(L.logoMaxHeight),
    "--ss-column-padding-top": inVar(L.columnPaddingTop),
    "--ss-column-padding-horizontal": inVar(L.columnPaddingHorizontal),
    "--ss-column-padding-bottom": inVar(L.columnPaddingBottom),
    "--ss-tier-head-gap": inVar(L.tierHeadGap),
    "--ss-tier-head-margin-bottom": inVar(L.tierHeadMarginBottom),
    "--ss-tier-head-padding-bottom": inVar(L.tierHeadPaddingBottom),
    "--ss-tier-banner-padding-top": inVar(L.tierBannerPaddingTop),
    "--ss-tier-banner-padding-bottom": inVar(L.tierBannerPaddingBottom),
    "--ss-tier-banner-padding-horizontal": inVar(L.tierBannerPaddingHorizontal),
    "--ss-systems-guide-block-max-width": inVar(L.systemsGuideBlockMaxWidth),
    "--ss-systems-guide-flourish-gap": inVar(L.systemsGuideFlourishGap),
    "--ss-systems-guide-flourish-min-width": inVar(L.systemsGuideFlourishMinWidth),
    "--ss-systems-guide-plaque-padding-top": inVar(L.systemsGuidePlaquePaddingTop),
    "--ss-systems-guide-plaque-padding-bottom": inVar(
      L.systemsGuidePlaquePaddingBottom,
    ),
    "--ss-systems-guide-plaque-padding-horizontal": inVar(
      L.systemsGuidePlaquePaddingHorizontal,
    ),
    "--ss-systems-guide-application-margin-bottom": inVar(
      L.systemsGuideApplicationMarginBottom,
    ),
    "--ss-can-wrap-min-height": inVar(L.canWrapMinHeight),
    "--ss-can-wrap-padding-vertical": inVar(L.canWrapPaddingVertical),
    "--ss-can-wrap-padding-horizontal": inVar(L.canWrapPaddingHorizontal),
    "--ss-can-max-height": inVar(L.canMaxHeight),
    "--ss-tier-features-gap": inVar(L.tierFeaturesGap),
    "--ss-paint-system-padding-vertical": inVar(L.paintSystemPaddingVertical),
    "--ss-paint-system-padding-horizontal": inVar(L.paintSystemPaddingHorizontal),
    "--ss-paint-system-section-head-gap": inVar(L.paintSystemSectionHeadGap),
    "--ss-paint-system-section-head-margin-bottom": inVar(
      L.paintSystemSectionHeadMarginBottom,
    ),
    "--ss-paint-system-list-gap": inVar(L.paintSystemListGap),
    "--ss-warranty-margin-top": inVar(L.warrantyMarginTop),
    "--ss-warranty-margin-bottom": inVar(L.warrantyMarginBottom),
    "--ss-warranty-padding-vertical": inVar(L.warrantyPaddingVertical),
    "--ss-warranty-padding-horizontal": inVar(L.warrantyPaddingHorizontal),
    "--ss-benefits-padding-vertical": inVar(L.benefitsPaddingVertical),
    "--ss-benefits-padding-horizontal": inVar(L.benefitsPaddingHorizontal),
    "--ss-benefits-heading-gap": inVar(L.benefitsHeadingGap),
    "--ss-benefits-heading-margin-bottom": inVar(L.benefitsHeadingMarginBottom),
    "--ss-benefits-feature-gap": inVar(L.benefitsFeatureGap),
    "--ss-features-divider-margin-vertical": inVar(0.02),
    "--ss-features-divider-margin-horizontal": inVar(0.04),
    "--ss-footer-padding-vertical": inVar(L.footerPaddingVertical),
    "--ss-footer-padding-horizontal": inVar(L.footerPaddingHorizontal),
    "--ss-color-column-best-bg": C.columnBestBackground,
    "--ss-color-column-best-border": C.columnBestBorder,
    "--ss-color-footer-bg": C.footerBackground,
    "--ss-tier-good-bg": TB.good.background,
    "--ss-tier-good-border": TB.good.border,
    "--ss-tier-good-text": TB.good.text,
    "--ss-tier-good-package": TB.good.package,
    "--ss-tier-good-accent": TB.good.accent,
    "--ss-tier-better-bg": TB.better.background,
    "--ss-tier-better-border": TB.better.border,
    "--ss-tier-better-text": TB.better.text,
    "--ss-tier-better-package": TB.better.package,
    "--ss-tier-better-accent": TB.better.accent,
    "--ss-tier-best-bg": TB.best.background,
    "--ss-tier-best-border": TB.best.border,
    "--ss-tier-best-text": TB.best.text,
    "--ss-tier-best-package": TB.best.package,
    "--ss-tier-best-accent": TB.best.accent,
    "--ss-tier-best-star": TB.best.star,
  } as CSSProperties;
}

const PT_PER_IN = 72;

export function sellSheetInchesToPt(inches: number): number {
  return inches * PT_PER_IN;
}

/** PDF layout derived from the same tokens as the web preview. */
export function buildSellSheetPdfLayout() {
  const L = SELL_SHEET_LAYOUT_IN;
  const F = SELL_SHEET_FONT_PT;
  const pt = sellSheetInchesToPt;

  const paintSystemRowHeight =
    F.feature * L.paintSystemLineHeight * L.paintSystemLines;

  return {
    page: {
      width: pt(SELL_SHEET_PAGE.widthIn),
      height: pt(SELL_SHEET_PAGE.heightIn),
    },
    header: {
      paddingTop: pt(L.headerPaddingTop),
      paddingHorizontal: pt(L.headerPaddingHorizontal),
      paddingBottom: pt(L.headerPaddingBottom),
      minHeight: pt(L.headerMinHeight),
      columnGap: pt(L.headerColumnGap),
      borderBottom: 2,
      background: SELL_SHEET_COLORS.headerBackground,
    },
    logo: {
      maxWidth: pt(L.logoMaxWidth),
      maxHeight: pt(L.logoMaxHeight),
    },
    systemsGuide: {
      blockMaxWidth: pt(L.systemsGuideBlockMaxWidth),
      flourishGap: pt(L.systemsGuideFlourishGap),
      flourishMinWidth: pt(L.systemsGuideFlourishMinWidth),
      gemSize: 4.5,
      plaquePaddingTop: pt(L.systemsGuidePlaquePaddingTop),
      plaquePaddingBottom: pt(L.systemsGuidePlaquePaddingBottom),
      plaquePaddingHorizontal: pt(L.systemsGuidePlaquePaddingHorizontal),
      applicationSize: F.systemsGuideApplication,
      applicationMarginBottom: pt(L.systemsGuideApplicationMarginBottom),
      applicationLetterSpacing: 0.14 * F.systemsGuideApplication,
      titleSize: F.systemsGuide,
      titleLetterSpacing: 0.035 * F.systemsGuide,
    },
    column: {
      paddingTop: pt(L.columnPaddingTop),
      paddingHorizontal: pt(L.columnPaddingHorizontal),
      paddingBottom: pt(L.columnPaddingBottom),
    },
    tierHead: {
      gap: pt(L.tierHeadGap),
      marginBottom: pt(L.tierHeadMarginBottom),
      paddingBottom: pt(L.tierHeadPaddingBottom),
    },
    tierBanner: {
      paddingTop: pt(L.tierBannerPaddingTop),
      paddingBottom: pt(L.tierBannerPaddingBottom),
      paddingHorizontal: pt(L.tierBannerPaddingHorizontal),
      innerGap: pt(L.tierBannerInnerGap),
      nameRowGap: pt(L.tierBannerNameRowGap),
      nameSize: F.tier,
      packageSize: F.tierPackage,
      nameLetterSpacing: F.tier * TIER_BANNER_TYPOGRAPHY.nameLetterSpacingEm,
      packageLetterSpacing:
        F.tierPackage * TIER_BANNER_TYPOGRAPHY.packageLetterSpacingEm,
      nameLineHeight: TIER_BANNER_TYPOGRAPHY.nameLineHeight,
      packageLineHeight: TIER_BANNER_TYPOGRAPHY.packageLineHeight,
      starSize: F.tier * TIER_BANNER_TYPOGRAPHY.starSizeEm,
      accentOpacity: TIER_BANNER_TYPOGRAPHY.accentOpacity,
      fontFamily: SELL_SHEET_PDF_FONT_FAMILY,
    },
    canWrap: {
      minHeight: pt(L.canWrapMinHeight),
      paddingVertical: pt(L.canWrapPaddingVertical),
      paddingHorizontal: pt(L.canWrapPaddingHorizontal),
      maxImageHeight: pt(L.canMaxHeight),
    },
    meta: {
      manufacturer: F.metaBold,
      paintType: F.meta,
    },
    warranty: {
      marginTop: pt(L.warrantyMarginTop),
      marginBottom: pt(L.warrantyMarginBottom),
      paddingVertical: pt(L.warrantyPaddingVertical),
      paddingHorizontal: pt(L.warrantyPaddingHorizontal),
      label: F.warrantyLabel,
      value: F.warrantyValue,
      unit: F.warrantyUnit,
      coverage: F.warrantyCoverage,
      iconSize: 9,
    },
    paintSystem: {
      paddingVertical: pt(L.paintSystemPaddingVertical),
      paddingHorizontal: pt(L.paintSystemPaddingHorizontal),
      sectionHeadGap: pt(L.paintSystemSectionHeadGap),
      sectionHeadMarginBottom: pt(L.paintSystemSectionHeadMarginBottom),
      iconCircle: 14,
      iconGlyph: 8,
      title: F.featuresTitle,
      listGap: pt(L.paintSystemListGap),
      rowHeight: paintSystemRowHeight,
      feature: F.feature,
      marker: 5,
      markerMarginTop: 4.5,
    },
    benefits: {
      paddingVertical: pt(L.benefitsPaddingVertical),
      paddingHorizontal: pt(L.benefitsPaddingHorizontal),
      headingGap: pt(L.benefitsHeadingGap),
      headingMarginBottom: pt(L.benefitsHeadingMarginBottom),
      pillPaddingVertical: pt(0.03),
      pillPaddingHorizontal: pt(0.08),
      iconSize: 9,
      title: 8,
      dividerMarginVertical: pt(0.02),
      dividerMarginHorizontal: pt(0.04),
      featureGap: pt(L.benefitsFeatureGap),
    },
    feature: {
      marker: 12.5,
      markerGlyph: 8,
      fontSize: F.feature,
      lineHeight: 1.42,
    },
    tierFeaturesGap: pt(L.tierFeaturesGap),
    footer: {
      paddingVertical: pt(L.footerPaddingVertical),
      paddingHorizontal: pt(L.footerPaddingHorizontal),
      fontSize: F.footer,
    },
  } as const;
}

export type SellSheetPdfLayout = ReturnType<typeof buildSellSheetPdfLayout>;
import type { CSSProperties } from "react";

import { SELL_SHEET_COLORS } from "@/lib/sell-sheet/display-tokens";

/** Single source of truth for product marketing sheet web preview + PDF export. */
export const PMS_PAGE = {
  widthIn: 8.5,
  heightIn: 11,
} as const;

export const PMS_COLORS = {
  navy900: SELL_SHEET_COLORS.navy900,
  navy800: SELL_SHEET_COLORS.navy800,
  blue600: SELL_SHEET_COLORS.blue600,
  blue500: SELL_SHEET_COLORS.blue500,
  silver600: SELL_SHEET_COLORS.silver600,
  silver500: SELL_SHEET_COLORS.silver500,
  border: SELL_SHEET_COLORS.border,
  headerBackground: SELL_SHEET_COLORS.headerBackground,
  panelBackground: SELL_SHEET_COLORS.paintSystemBackground,
  panelBorder: SELL_SHEET_COLORS.paintSystemBorder,
  footerBackground: SELL_SHEET_COLORS.footerBackground,
  description: "#2a3544",
  badgeBackground: "#eaf3fc",
  discontinuedBackground: "#fff4e5",
  discontinuedBorder: "#e8c98e",
  discontinuedText: "#8a5a12",
  canWrapBackground: "#ffffff",
} as const;

/** Layout values mirror globals.css (1rem = 16px at sheet scale). */
export const PMS_LAYOUT_REM = {
  pagePaddingTop: 1.35,
  pagePaddingHorizontal: 1.6,
  pagePaddingBottom: 1.5,
  headerMarginTop: 1.35,
  headerMarginHorizontal: 1.6,
  headerMarginBottom: 1.15,
  headerPaddingTop: 1.2,
  headerPaddingHorizontal: 1.6,
  headerPaddingBottom: 0.85,
  logoMarginBottom: 0.4,
  logoMaxHeight: 4.8,
  manufacturerMarginBottom: 0.35,
  headerAsideGap: 0.45,
  productNameSize: 2,
  productNameLineHeight: 1.12,
  badgeFontSize: 0.68,
  badgePaddingVertical: 0.45,
  badgePaddingHorizontal: 0.85,
  badgeLetterSpacingEm: 0.12,
  discontinuedMarginBottom: 1,
  discontinuedPaddingVertical: 0.55,
  discontinuedPaddingHorizontal: 0.75,
  discontinuedFontSize: 0.68,
  heroColumnMin: 13.5,
  heroColumnMax: 16.5,
  heroGap: 1.35,
  heroMarginBottom: 1.35,
  canWrapMinHeight: 18.75,
  canWrapPadding: 0.85,
  canMaxHeight: 16.5,
  metaRowGap: 0.45,
  metaRowMarginBottom: 0.9,
  pillFontSize: 0.74,
  pillPaddingVertical: 0.28,
  pillPaddingHorizontal: 0.7,
  descriptionFontSize: 0.95,
  descriptionLineHeight: 1.6,
  columnsGap: 0.9,
  columnsMarginBottom: 1,
  panelPaddingVertical: 0.9,
  panelPaddingHorizontal: 1,
  blockMarginBottom: 0.9,
  sectionTitleFontSize: 0.68,
  sectionTitleMarginBottom: 0.55,
  sectionTitleLetterSpacingEm: 0.12,
  listPaddingLeft: 0.95,
  listItemMarginBottom: 0.35,
  listFontSize: 0.86,
  listLineHeight: 1.45,
  listColumnGap: 1.1,
  metaLineMarginBottom: 0.35,
  footerMarginTop: 1.1,
  footerPaddingTop: 0.75,
  footerFontSize: 0.72,
  emptyFontSize: 0.82,
  manufacturerFontSize: 0.68,
  manufacturerLetterSpacingEm: 0.14,
  metaLabelFontSize: 0.68,
  metaValueFontSize: 0.82,
  metaLinkFontSize: 0.78,
} as const;

export const PMS_LAYOUT_PX = {
  logoMaxWidth: 440,
  logoImageHeight: 112,
  canImageWidth: 330,
  canImageHeight: 420,
  canBorderRadius: 12,
  panelBorderRadius: 10,
  discontinuedBorderRadius: 8,
  headerBorderBottom: 2,
} as const;

/**
 * PDF uses the same layout tokens as the web sheet at 1:1 print size on letter
 * portrait (8.5×11 in). Keep at 1 so downloaded PDF matches the web preview scale.
 */
export const PMS_PDF_UNIFORM_SCALE = 1;

const PT_PER_IN = 72;
const REM_PX = 16;
const PX_PER_IN = 96;

export function pmsRemToPt(rem: number): number {
  return (rem * REM_PX * PT_PER_IN) / PX_PER_IN;
}

export function pmsPxToPt(px: number): number {
  return (px * PT_PER_IN) / PX_PER_IN;
}

function remVar(rem: number): string {
  return `${rem}rem`;
}

function pxVar(px: number): string {
  return `${px}px`;
}

/** Structural CSS vars consumed by globals.css product-marketing-sheet rules. */
export const PRODUCT_MARKETING_SHEET_STRUCTURE_CSS_VARS = [
  "--pms-page-width",
  "--pms-page-min-height",
  "--pms-page-padding-top",
  "--pms-page-padding-horizontal",
  "--pms-page-padding-bottom",
  "--pms-header-margin-top",
  "--pms-header-margin-horizontal",
  "--pms-header-margin-bottom",
  "--pms-header-padding-top",
  "--pms-header-padding-horizontal",
  "--pms-header-padding-bottom",
  "--pms-logo-margin-bottom",
  "--pms-logo-max-width",
  "--pms-logo-max-height",
  "--pms-manufacturer-margin-bottom",
  "--pms-header-aside-gap",
  "--pms-product-name-size",
  "--pms-product-name-line-height",
  "--pms-badge-font-size",
  "--pms-badge-padding-vertical",
  "--pms-badge-padding-horizontal",
  "--pms-badge-letter-spacing",
  "--pms-discontinued-margin-bottom",
  "--pms-discontinued-padding-vertical",
  "--pms-discontinued-padding-horizontal",
  "--pms-discontinued-font-size",
  "--pms-hero-column-min",
  "--pms-hero-column-max",
  "--pms-hero-gap",
  "--pms-hero-margin-bottom",
  "--pms-can-wrap-min-height",
  "--pms-can-wrap-padding",
  "--pms-can-max-height",
  "--pms-can-border-radius",
  "--pms-meta-row-gap",
  "--pms-meta-row-margin-bottom",
  "--pms-pill-font-size",
  "--pms-pill-padding-vertical",
  "--pms-pill-padding-horizontal",
  "--pms-description-font-size",
  "--pms-description-line-height",
  "--pms-columns-gap",
  "--pms-columns-margin-bottom",
  "--pms-panel-padding-vertical",
  "--pms-panel-padding-horizontal",
  "--pms-panel-border-radius",
  "--pms-block-margin-bottom",
  "--pms-section-title-font-size",
  "--pms-section-title-margin-bottom",
  "--pms-section-title-letter-spacing",
  "--pms-list-padding-left",
  "--pms-list-item-margin-bottom",
  "--pms-list-font-size",
  "--pms-list-line-height",
  "--pms-list-column-gap",
  "--pms-meta-line-margin-bottom",
  "--pms-footer-margin-top",
  "--pms-footer-padding-top",
  "--pms-footer-font-size",
  "--pms-empty-font-size",
  "--pms-manufacturer-font-size",
  "--pms-manufacturer-letter-spacing",
  "--pms-meta-label-font-size",
  "--pms-meta-value-font-size",
  "--pms-meta-link-font-size",
] as const;

export function productMarketingSheetDisplayStyle(): CSSProperties {
  const L = PMS_LAYOUT_REM;
  const P = PMS_LAYOUT_PX;
  const C = PMS_COLORS;

  return {
    "--pms-page-width": `${PMS_PAGE.widthIn}in`,
    "--pms-page-min-height": `${PMS_PAGE.heightIn}in`,
    "--pms-page-padding-top": remVar(L.pagePaddingTop),
    "--pms-page-padding-horizontal": remVar(L.pagePaddingHorizontal),
    "--pms-page-padding-bottom": remVar(L.pagePaddingBottom),
    "--pms-header-margin-top": remVar(L.headerMarginTop),
    "--pms-header-margin-horizontal": remVar(L.headerMarginHorizontal),
    "--pms-header-margin-bottom": remVar(L.headerMarginBottom),
    "--pms-header-padding-top": remVar(L.headerPaddingTop),
    "--pms-header-padding-horizontal": remVar(L.headerPaddingHorizontal),
    "--pms-header-padding-bottom": remVar(L.headerPaddingBottom),
    "--pms-logo-margin-bottom": remVar(L.logoMarginBottom),
    "--pms-logo-max-width": pxVar(P.logoMaxWidth),
    "--pms-logo-max-height": remVar(L.logoMaxHeight),
    "--pms-manufacturer-margin-bottom": remVar(L.manufacturerMarginBottom),
    "--pms-header-aside-gap": remVar(L.headerAsideGap),
    "--pms-product-name-size": remVar(L.productNameSize),
    "--pms-product-name-line-height": String(L.productNameLineHeight),
    "--pms-badge-font-size": remVar(L.badgeFontSize),
    "--pms-badge-padding-vertical": remVar(L.badgePaddingVertical),
    "--pms-badge-padding-horizontal": remVar(L.badgePaddingHorizontal),
    "--pms-badge-letter-spacing": `${L.badgeLetterSpacingEm}em`,
    "--pms-discontinued-margin-bottom": remVar(L.discontinuedMarginBottom),
    "--pms-discontinued-padding-vertical": remVar(L.discontinuedPaddingVertical),
    "--pms-discontinued-padding-horizontal": remVar(L.discontinuedPaddingHorizontal),
    "--pms-discontinued-font-size": remVar(L.discontinuedFontSize),
    "--pms-hero-column-min": remVar(L.heroColumnMin),
    "--pms-hero-column-max": remVar(L.heroColumnMax),
    "--pms-hero-gap": remVar(L.heroGap),
    "--pms-hero-margin-bottom": remVar(L.heroMarginBottom),
    "--pms-can-wrap-min-height": remVar(L.canWrapMinHeight),
    "--pms-can-wrap-padding": remVar(L.canWrapPadding),
    "--pms-can-max-height": remVar(L.canMaxHeight),
    "--pms-can-border-radius": pxVar(P.canBorderRadius),
    "--pms-meta-row-gap": remVar(L.metaRowGap),
    "--pms-meta-row-margin-bottom": remVar(L.metaRowMarginBottom),
    "--pms-pill-font-size": remVar(L.pillFontSize),
    "--pms-pill-padding-vertical": remVar(L.pillPaddingVertical),
    "--pms-pill-padding-horizontal": remVar(L.pillPaddingHorizontal),
    "--pms-description-font-size": remVar(L.descriptionFontSize),
    "--pms-description-line-height": String(L.descriptionLineHeight),
    "--pms-columns-gap": remVar(L.columnsGap),
    "--pms-columns-margin-bottom": remVar(L.columnsMarginBottom),
    "--pms-panel-padding-vertical": remVar(L.panelPaddingVertical),
    "--pms-panel-padding-horizontal": remVar(L.panelPaddingHorizontal),
    "--pms-panel-border-radius": pxVar(P.panelBorderRadius),
    "--pms-block-margin-bottom": remVar(L.blockMarginBottom),
    "--pms-section-title-font-size": remVar(L.sectionTitleFontSize),
    "--pms-section-title-margin-bottom": remVar(L.sectionTitleMarginBottom),
    "--pms-section-title-letter-spacing": `${L.sectionTitleLetterSpacingEm}em`,
    "--pms-list-padding-left": remVar(L.listPaddingLeft),
    "--pms-list-item-margin-bottom": remVar(L.listItemMarginBottom),
    "--pms-list-font-size": remVar(L.listFontSize),
    "--pms-list-line-height": String(L.listLineHeight),
    "--pms-list-column-gap": remVar(L.listColumnGap),
    "--pms-meta-line-margin-bottom": remVar(L.metaLineMarginBottom),
    "--pms-footer-margin-top": remVar(L.footerMarginTop),
    "--pms-footer-padding-top": remVar(L.footerPaddingTop),
    "--pms-footer-font-size": remVar(L.footerFontSize),
    "--pms-empty-font-size": remVar(L.emptyFontSize),
    "--pms-manufacturer-font-size": remVar(L.manufacturerFontSize),
    "--pms-manufacturer-letter-spacing": `${L.manufacturerLetterSpacingEm}em`,
    "--pms-meta-label-font-size": remVar(L.metaLabelFontSize),
    "--pms-meta-value-font-size": remVar(L.metaValueFontSize),
    "--pms-meta-link-font-size": remVar(L.metaLinkFontSize),
    "--pms-navy-900": C.navy900,
    "--pms-navy-800": C.navy800,
    "--pms-blue-600": C.blue600,
    "--pms-blue-500": C.blue500,
    "--pms-silver-600": C.silver600,
    "--pms-silver-500": C.silver500,
    "--pms-border": C.border,
    "--pms-header-bg": C.headerBackground,
    "--pms-panel-bg": C.panelBackground,
    "--pms-panel-border": C.panelBorder,
    "--pms-footer-bg": C.footerBackground,
  } as CSSProperties;
}

/** PDF layout — same tokens as web preview, uniformly scaled for portrait letter. */
export function buildProductMarketingSheetPdfLayout() {
  const L = PMS_LAYOUT_REM;
  const P = PMS_LAYOUT_PX;
  const scale = PMS_PDF_UNIFORM_SCALE;
  const rem = (value: number) => pmsRemToPt(value) * scale;
  const px = (value: number) => pmsPxToPt(value) * scale;
  const canImageHeight = rem(L.canMaxHeight);
  const canImageWidth =
    (canImageHeight * P.canImageWidth) / P.canImageHeight;

  return {
    page: {
      width: PMS_PAGE.widthIn * PT_PER_IN,
      height: PMS_PAGE.heightIn * PT_PER_IN,
      paddingTop: rem(L.pagePaddingTop),
      paddingHorizontal: rem(L.pagePaddingHorizontal),
      paddingBottom: rem(L.pagePaddingBottom),
    },
    header: {
      marginTop: -rem(L.headerMarginTop),
      marginHorizontal: -rem(L.headerMarginHorizontal),
      marginBottom: rem(L.headerMarginBottom),
      paddingTop: rem(L.headerPaddingTop),
      paddingHorizontal: rem(L.headerPaddingHorizontal),
      paddingBottom: rem(L.headerPaddingBottom),
      borderBottom: P.headerBorderBottom,
    },
    logo: {
      marginBottom: rem(L.logoMarginBottom),
      maxWidth: px(P.logoMaxWidth),
      maxHeight: rem(L.logoMaxHeight),
    },
    manufacturer: {
      marginBottom: rem(L.manufacturerMarginBottom),
      fontSize: rem(L.manufacturerFontSize),
      letterSpacing: L.manufacturerLetterSpacingEm * rem(L.manufacturerFontSize),
    },
    productName: {
      fontSize: rem(L.productNameSize),
      lineHeight: L.productNameLineHeight,
    },
    badge: {
      fontSize: rem(L.badgeFontSize),
      paddingVertical: rem(L.badgePaddingVertical),
      paddingHorizontal: rem(L.badgePaddingHorizontal),
      letterSpacing: L.badgeLetterSpacingEm * rem(L.badgeFontSize),
    },
    discontinued: {
      marginBottom: rem(L.discontinuedMarginBottom),
      paddingVertical: rem(L.discontinuedPaddingVertical),
      paddingHorizontal: rem(L.discontinuedPaddingHorizontal),
      fontSize: rem(L.discontinuedFontSize),
      borderRadius: px(P.discontinuedBorderRadius),
    },
    headerAside: {
      gap: rem(L.headerAsideGap),
      maxWidth: "52%",
    },
    hero: {
      columnMin: rem(L.heroColumnMin),
      columnMax: rem(L.heroColumnMax),
      gap: rem(L.heroGap),
      marginBottom: rem(L.heroMarginBottom),
    },
    canWrap: {
      width: rem(L.heroColumnMax),
      minHeight: rem(L.canWrapMinHeight),
      padding: rem(L.canWrapPadding),
      borderRadius: px(P.canBorderRadius),
      imageWidth: canImageWidth,
      imageHeight: canImageHeight,
    },
    metaRow: {
      gap: rem(L.metaRowGap),
      marginBottom: rem(L.metaRowMarginBottom),
    },
    pill: {
      fontSize: rem(L.pillFontSize),
      paddingVertical: rem(L.pillPaddingVertical),
      paddingHorizontal: rem(L.pillPaddingHorizontal),
    },
    description: {
      fontSize: rem(L.descriptionFontSize),
      lineHeight: L.descriptionLineHeight,
    },
    columns: {
      gap: rem(L.columnsGap),
      marginBottom: rem(L.columnsMarginBottom),
    },
    panel: {
      paddingVertical: rem(L.panelPaddingVertical),
      paddingHorizontal: rem(L.panelPaddingHorizontal),
      borderRadius: px(P.panelBorderRadius),
    },
    block: {
      marginBottom: rem(L.blockMarginBottom),
    },
    sectionTitle: {
      fontSize: rem(L.sectionTitleFontSize),
      marginBottom: rem(L.sectionTitleMarginBottom),
      letterSpacing: L.sectionTitleLetterSpacingEm * rem(L.sectionTitleFontSize),
    },
    list: {
      paddingLeft: rem(L.listPaddingLeft),
      itemMarginBottom: rem(L.listItemMarginBottom),
      fontSize: rem(L.listFontSize),
      lineHeight: L.listLineHeight,
      columnGap: rem(L.listColumnGap),
      bulletWidth: rem(L.listPaddingLeft),
    },
    metaLine: {
      marginBottom: rem(L.metaLineMarginBottom),
    },
    metaLabel: {
      fontSize: rem(L.metaLabelFontSize),
    },
    metaValue: {
      fontSize: rem(L.metaValueFontSize),
    },
    metaLink: {
      fontSize: rem(L.metaLinkFontSize),
    },
    footer: {
      marginTop: rem(L.footerMarginTop),
      paddingTop: rem(L.footerPaddingTop),
      fontSize: rem(L.footerFontSize),
    },
    empty: {
      fontSize: rem(L.emptyFontSize),
    },
  } as const;
}

export type ProductMarketingSheetPdfLayout = ReturnType<
  typeof buildProductMarketingSheetPdfLayout
>;
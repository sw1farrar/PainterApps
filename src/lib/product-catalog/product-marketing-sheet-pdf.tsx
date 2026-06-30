import React from "react";
import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  buildProductMarketingSheetPdfLayout,
  PMS_COLORS,
} from "@/lib/product-catalog/product-marketing-sheet-display-tokens";
import {
  buildProductMarketingSheetMetaPills,
  type ProductMarketingSheetView,
} from "@/lib/product-catalog/product-marketing-sheet";
import { SELL_SHEET_PDF_FONT_FAMILY } from "@/lib/sell-sheet/display-tokens";
import { isPdfEmbeddedImageSrc } from "@/lib/product-catalog/product-marketing-sheet-pdf-assets";

const C = PMS_COLORS;
const L = buildProductMarketingSheetPdfLayout();

const styles = StyleSheet.create({
  page: {
    width: L.page.width,
    height: L.page.height,
    paddingTop: L.page.paddingTop,
    paddingBottom: L.page.paddingBottom,
    paddingHorizontal: L.page.paddingHorizontal,
    fontFamily: SELL_SHEET_PDF_FONT_FAMILY,
    fontSize: L.list.fontSize,
    color: C.navy900,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: L.header.borderBottom,
    borderBottomColor: C.blue500,
    paddingBottom: L.header.paddingBottom,
    marginBottom: L.header.marginBottom,
    backgroundColor: C.headerBackground,
    marginHorizontal: L.header.marginHorizontal,
    marginTop: L.header.marginTop,
    paddingTop: L.header.paddingTop,
    paddingHorizontal: L.header.paddingHorizontal,
  },
  brand: {
    flex: 1,
    minWidth: 0,
  },
  logoWrap: {
    marginBottom: L.logo.marginBottom,
    maxWidth: L.logo.maxWidth,
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  logo: {
    maxWidth: L.logo.maxWidth,
    maxHeight: L.logo.maxHeight,
    objectFit: "contain",
    objectPosition: "0% 50%",
  },
  headerAside: {
    flexDirection: "column",
    flexShrink: 0,
    maxWidth: L.headerAside.maxWidth,
    alignItems: "flex-end",
    gap: L.headerAside.gap,
  },
  manufacturer: {
    fontSize: L.manufacturer.fontSize,
    color: C.silver600,
    textTransform: "uppercase",
    letterSpacing: L.manufacturer.letterSpacing,
    marginBottom: L.manufacturer.marginBottom,
    fontWeight: "bold",
  },
  productName: {
    fontFamily: SELL_SHEET_PDF_FONT_FAMILY,
    fontSize: L.productName.fontSize,
    fontWeight: 800,
    color: C.navy900,
    lineHeight: L.productName.lineHeight,
    textAlign: "right",
  },
  badge: {
    borderWidth: 1,
    borderColor: C.blue500,
    backgroundColor: C.badgeBackground,
    color: C.blue600,
    fontSize: L.badge.fontSize,
    fontWeight: "bold",
    letterSpacing: L.badge.letterSpacing,
    paddingVertical: L.badge.paddingVertical,
    paddingHorizontal: L.badge.paddingHorizontal,
    textTransform: "uppercase",
    borderRadius: 999,
  },
  discontinued: {
    marginBottom: L.discontinued.marginBottom,
    paddingVertical: L.discontinued.paddingVertical,
    paddingHorizontal: L.discontinued.paddingHorizontal,
    backgroundColor: C.discontinuedBackground,
    borderWidth: 1,
    borderColor: C.discontinuedBorder,
    borderRadius: L.discontinued.borderRadius,
    color: C.discontinuedText,
    fontSize: L.discontinued.fontSize,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  hero: {
    flexDirection: "row",
    gap: L.hero.gap,
    marginBottom: L.hero.marginBottom,
    alignItems: "flex-start",
  },
  canWrap: {
    width: L.canWrap.width,
    minHeight: L.canWrap.minHeight,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: L.canWrap.borderRadius,
    backgroundColor: C.canWrapBackground,
    alignItems: "center",
    justifyContent: "center",
    padding: L.canWrap.padding,
  },
  canImage: {
    width: L.canWrap.imageWidth,
    height: L.canWrap.imageHeight,
    objectFit: "contain",
  },
  canPlaceholder: {
    fontFamily: "Helvetica",
    fontSize: L.empty.fontSize,
    color: C.silver500,
    textAlign: "center",
    fontStyle: "italic",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: L.metaRow.gap,
    marginBottom: L.metaRow.marginBottom,
  },
  pill: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingVertical: L.pill.paddingVertical,
    paddingHorizontal: L.pill.paddingHorizontal,
    fontSize: L.pill.fontSize,
    color: C.navy800,
    fontWeight: "bold",
  },
  description: {
    fontSize: L.description.fontSize,
    lineHeight: L.description.lineHeight,
    color: C.description,
  },
  columns: {
    flexDirection: "row",
    gap: L.columns.gap,
    marginBottom: L.columns.marginBottom,
  },
  panel: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.panelBorder,
    backgroundColor: C.panelBackground,
    borderRadius: L.panel.borderRadius,
    paddingVertical: L.panel.paddingVertical,
    paddingHorizontal: L.panel.paddingHorizontal,
  },
  sectionTitle: {
    fontSize: L.sectionTitle.fontSize,
    fontWeight: "bold",
    letterSpacing: L.sectionTitle.letterSpacing,
    textTransform: "uppercase",
    color: C.blue600,
    marginBottom: L.sectionTitle.marginBottom,
  },
  listColumns: {
    flexDirection: "row",
    gap: L.list.columnGap,
  },
  listColumn: {
    flex: 1,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: L.list.itemMarginBottom,
  },
  bullet: {
    width: L.list.bulletWidth,
    fontSize: L.list.fontSize,
    color: C.blue500,
    fontWeight: "bold",
  },
  listText: {
    flex: 1,
    fontSize: L.list.fontSize,
    lineHeight: L.list.lineHeight,
    color: C.navy800,
  },
  specsBlock: {
    borderWidth: 1,
    borderColor: C.panelBorder,
    backgroundColor: C.panelBackground,
    borderRadius: L.panel.borderRadius,
    paddingVertical: L.panel.paddingVertical,
    paddingHorizontal: L.panel.paddingHorizontal,
    marginBottom: L.block.marginBottom,
  },
  metaBlock: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.footerBackground,
    borderRadius: L.panel.borderRadius,
    paddingVertical: L.panel.paddingVertical,
    paddingHorizontal: L.panel.paddingHorizontal,
    marginBottom: L.block.marginBottom,
  },
  metaLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: L.metaLine.marginBottom,
  },
  metaLabel: {
    fontSize: L.metaLabel.fontSize,
    color: C.silver600,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "bold",
  },
  metaValue: {
    fontSize: L.metaValue.fontSize,
    color: C.navy900,
    fontWeight: "bold",
    textTransform: "capitalize",
    flex: 1,
    textAlign: "right",
  },
  metaLink: {
    fontSize: L.metaLink.fontSize,
    color: C.blue600,
    fontWeight: "bold",
    flex: 1,
    textAlign: "right",
    textDecoration: "underline",
  },
  empty: {
    fontFamily: "Helvetica",
    fontSize: L.empty.fontSize,
    color: C.silver500,
    fontStyle: "italic",
  },
  footer: {
    marginTop: L.footer.marginTop,
    paddingTop: L.footer.paddingTop,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  footerText: {
    fontSize: L.footer.fontSize,
    color: C.silver500,
    flex: 1,
  },
});

function ListItems({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item) => (
        <View key={item} style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

function ListBlock({
  items,
  emptyLabel,
  twoColumn = false,
}: {
  items: string[];
  emptyLabel: string;
  twoColumn?: boolean;
}) {
  if (items.length === 0) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }

  if (!twoColumn) {
    return <ListItems items={items} />;
  }

  const splitAt = Math.ceil(items.length / 2);
  const left = items.slice(0, splitAt);
  const right = items.slice(splitAt);

  return (
    <View style={styles.listColumns}>
      <View style={styles.listColumn}>
        <ListItems items={left} />
      </View>
      <View style={styles.listColumn}>
        <ListItems items={right} />
      </View>
    </View>
  );
}

export function ProductMarketingSheetPdfDocument({
  view,
}: {
  view: ProductMarketingSheetView;
}) {
  const metaPills = buildProductMarketingSheetMetaPills(view);
  const manufacturerLogoUrl = isPdfEmbeddedImageSrc(view.manufacturerLogoUrl)
    ? view.manufacturerLogoUrl
    : null;
  const canImageUrl = isPdfEmbeddedImageSrc(view.canImageUrl)
    ? view.canImageUrl
    : null;

  return (
    <Document>
      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <View style={styles.brand}>
            {manufacturerLogoUrl ? (
              <View style={styles.logoWrap} wrap={false}>
                <Image src={manufacturerLogoUrl} style={styles.logo} />
              </View>
            ) : (
              <Text style={styles.manufacturer}>{view.manufacturerName}</Text>
            )}
          </View>
          <View style={styles.headerAside}>
            <Text style={styles.productName}>{view.productName}</Text>
            <Text style={styles.badge}>{view.applicationLabel}</Text>
          </View>
        </View>

        {view.isDiscontinued ? (
          <Text style={styles.discontinued}>Discontinued product</Text>
        ) : null}

        <View style={styles.hero} wrap={false}>
          <View style={styles.canWrap}>
            {canImageUrl ? (
              <Image src={canImageUrl} style={styles.canImage} />
            ) : (
              <Text style={styles.canPlaceholder}>Can image not available</Text>
            )}
          </View>

          <View style={styles.heroCopy}>
            <View style={styles.metaRow}>
              {metaPills.map((pill) => (
                <Text key={pill} style={styles.pill}>
                  {pill}
                </Text>
              ))}
            </View>

            {view.description ? (
              <Text style={styles.description}>{view.description}</Text>
            ) : (
              <Text style={styles.empty}>
                Product description has not been added yet.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Sheen options</Text>
            <ListBlock items={view.sheenOptions} emptyLabel="No sheens listed." />
          </View>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Product capabilities</Text>
            <ListBlock
              items={view.productCapabilities}
              emptyLabel="No capability flags listed."
              twoColumn
            />
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Product uses</Text>
            <ListBlock
              items={view.productUses}
              emptyLabel="No product uses listed."
              twoColumn
            />
          </View>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Substrates</Text>
            <ListBlock
              items={view.substrates}
              emptyLabel="No substrates listed."
              twoColumn
            />
          </View>
        </View>

        {view.recommendedUses.length > 0 ? (
          <View style={styles.specsBlock}>
            <Text style={styles.sectionTitle}>Recommended uses</Text>
            <ListBlock
              items={view.recommendedUses}
              emptyLabel="No recommended uses listed."
              twoColumn
            />
          </View>
        ) : null}

        <View style={styles.columns}>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Paint system features</Text>
            <ListBlock
              items={view.paintSystemFeatures}
              emptyLabel="No paint system features listed."
              twoColumn
            />
          </View>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Coating specifications</Text>
            <ListBlock
              items={view.paintSystemFeatureOptions}
              emptyLabel="No coating specifications listed."
              twoColumn
            />
          </View>
        </View>

        <View style={styles.metaBlock}>
          <View style={styles.metaLine}>
            <Text style={styles.metaLabel}>Catalog data status</Text>
            <Text style={styles.metaValue}>{view.enrichmentStatus}</Text>
          </View>
          {view.lastGatheredLabel ? (
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Last updated</Text>
              <Text style={styles.metaValue}>{view.lastGatheredLabel}</Text>
            </View>
          ) : null}
          {view.sourceUrl ? (
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Source</Text>
              <Link src={view.sourceUrl} style={styles.metaLink}>
                {view.sourceUrl}
              </Link>
            </View>
          ) : null}
          {view.attributeSourceUrl ? (
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Attribute source</Text>
              <Link src={view.attributeSourceUrl} style={styles.metaLink}>
                {view.attributeSourceUrl}
              </Link>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>PainterApps Product Catalog</Text>
          <Text style={styles.footerText}>
            {view.manufacturerName} — {view.productName}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  TIER_BANNER_COLORS,
  TIER_BANNER_GRADIENTS,
  TIER_BANNER_TYPOGRAPHY,
} from "@/lib/sell-sheet/tier-banner-display";
import { SS_PDF_LAYOUT } from "@/lib/sell-sheet/pdf-layout";
import type { SellSheetTierKey } from "@/types/sell-sheet";

const L = SS_PDF_LAYOUT;
const TB = L.tierBanner;

function hexWithOpacity(hex: string, opacity: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const styles = StyleSheet.create({
  banner: {
    position: "relative",
    width: "100%",
    alignSelf: "stretch",
    paddingTop: TB.paddingTop,
    paddingBottom: TB.paddingBottom,
    paddingHorizontal: TB.paddingHorizontal,
    alignItems: "center",
    overflow: "hidden",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "column",
  },
  backgroundBand: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "42%",
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  accent: {
    position: "absolute",
    top: 0,
    left: "8%",
    right: "8%",
    height: 2,
    borderRadius: 1,
  },
  inner: {
    alignItems: "center",
    width: "100%",
    gap: TB.innerGap,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: TB.nameRowGap,
    width: "100%",
  },
  name: {
    fontFamily: TB.fontFamily,
    fontSize: TB.nameSize,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: TB.nameLetterSpacing,
    lineHeight: TB.nameLineHeight,
    textAlign: "center",
  },
  star: {
    fontFamily: TB.fontFamily,
    fontSize: TB.starSize,
    fontWeight: 800,
    lineHeight: 1,
  },
  package: {
    fontFamily: TB.fontFamily,
    fontSize: TB.packageSize,
    fontWeight: 600,
    letterSpacing: TB.packageLetterSpacing,
    lineHeight: TB.packageLineHeight,
    textAlign: "center",
    width: "100%",
  },
});

/** Vertical gradient bands — react-pdf SVG gradients corrupt PDF text colors. */
function TierBannerBackground({ tierKey }: { tierKey: SellSheetTierKey }) {
  const stops = TIER_BANNER_GRADIENTS[tierKey].stops;
  const midOffset = Number.parseFloat(stops[1].offset) / 100;

  return (
    <View style={styles.background}>
      <View
        style={[
          styles.backgroundBand,
          { flexGrow: midOffset * 2, backgroundColor: stops[0].color },
        ]}
      />
      <View
        style={[
          styles.backgroundBand,
          { flexGrow: 2, backgroundColor: stops[1].color },
        ]}
      />
      <View
        style={[
          styles.backgroundBand,
          { flexGrow: (1 - midOffset) * 2, backgroundColor: stops[2].color },
        ]}
      />
      <View style={styles.shine} />
    </View>
  );
}

const TIER_DEFAULT_LABELS: Record<SellSheetTierKey, string> = {
  good: "Good",
  better: "Better",
  best: "Best",
};

export function PdfSellSheetTierBanner({
  tierKey,
  primary,
  secondary,
}: {
  tierKey: SellSheetTierKey;
  primary: string;
  secondary: string | null;
}) {
  const colors = TIER_BANNER_COLORS[tierKey];
  const isBest = tierKey === "best";
  const tierLabel = primary.trim() || TIER_DEFAULT_LABELS[tierKey];
  const packageLabel = secondary?.trim() || null;

  return (
    <View style={styles.banner}>
      <TierBannerBackground tierKey={tierKey} />
      <View
        style={[
          styles.accent,
          {
            backgroundColor: hexWithOpacity(
              colors.accent,
              TIER_BANNER_TYPOGRAPHY.accentOpacity,
            ),
          },
        ]}
      />
      <View style={styles.inner}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]}>{tierLabel}</Text>
          {isBest ? (
            <Text style={[styles.star, { color: colors.star }]}>★</Text>
          ) : null}
        </View>
        {packageLabel ? (
          <Text style={[styles.package, { color: colors.package }]}>
            {packageLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
import { Path, Svg, View } from "@react-pdf/renderer";
import { SS_PDF_LAYOUT } from "@/lib/sell-sheet/pdf-layout";

type PdfIconProps = {
  size?: number;
  color?: string;
};

export function PdfPaintSystemIcon({
  size = SS_PDF_LAYOUT.paintSystem.iconCircle,
}: {
  size?: number;
}) {
  const glyph = SS_PDF_LAYOUT.paintSystem.iconGlyph;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#2b6cb8",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={glyph} height={glyph} viewBox="0 0 24 24">
        <Path
          d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
          fill="#ffffff"
        />
      </Svg>
    </View>
  );
}

export function PdfSparklesIcon({
  size = SS_PDF_LAYOUT.benefits.iconSize,
  color = "#6a7889",
}: PdfIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9.94 2.94 8 7.5l-4.56 1.94L8 11.38l1.94 4.56L12 11.38l4.56-1.94L12 7.5 10.06 2.94zM18 14l-1.16 2.74L14.1 18l2.74 1.16L18 22l1.16-2.84L22 18l-2.84-1.26L18 14z"
        fill={color}
      />
    </Svg>
  );
}

export function PdfShieldIcon({
  size = SS_PDF_LAYOUT.warranty.iconSize,
  color = "#2b6cb8",
}: PdfIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        fill="none"
        stroke={color}
        strokeWidth={2.25}
      />
    </Svg>
  );
}

export function PdfCheckIcon({
  size = SS_PDF_LAYOUT.feature.markerGlyph,
  color = "#ffffff",
}: PdfIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20 6 9 17l-5-5"
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
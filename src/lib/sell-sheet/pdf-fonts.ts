import { Font } from "@react-pdf/renderer";
import { SELL_SHEET_PDF_FONT_FAMILY } from "@/lib/sell-sheet/display-tokens";

let registered = false;

function sellSheetFontSrc(path: string): string {
  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).href;
  }
  const relative = path.replace(/^\//, "");
  return `${process.cwd()}/public/${relative}`;
}

/** Registers Source Sans 3 from /public/fonts for PDF rendering (browser or server). */
export function registerSellSheetPdfFonts() {
  if (registered) return;

  Font.register({
    family: SELL_SHEET_PDF_FONT_FAMILY,
    fonts: [
      {
        src: sellSheetFontSrc("/fonts/source-sans-3-latin-600-normal.woff"),
        fontWeight: 400,
        fontStyle: "normal",
      },
      {
        src: sellSheetFontSrc("/fonts/source-sans-3-latin-600-normal.woff"),
        fontWeight: 600,
        fontStyle: "normal",
      },
      {
        src: sellSheetFontSrc("/fonts/source-sans-3-latin-800-normal.woff"),
        fontWeight: 800,
        fontStyle: "normal",
      },
    ],
  });

  registered = true;
}
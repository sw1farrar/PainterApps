"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePDF } from "@react-pdf/renderer";
import { Loader2 } from "lucide-react";
import {
  scaleImageToFit,
  trimTransparentEdges,
} from "@/lib/images/trim-transparent";
import { sellSheetDisplayStyle } from "@/lib/sell-sheet/display-tokens";
import { registerSellSheetPdfFonts } from "@/lib/sell-sheet/pdf-fonts";
import { SellSheetPdfDocument } from "@/lib/sell-sheet/pdf-document";
import { sellSheetPdfPayloadKey } from "@/lib/sell-sheet/utils";
import type { SellSheetData } from "@/types/sell-sheet";
import type { SellSheetPdfLabels } from "@/lib/sell-sheet/pdf-document";

const PDF_LOGO_MAX_WIDTH = 160;
const PDF_LOGO_MAX_HEIGHT = 64;

/** Shell fills the stage — Fit scales once to the full preview area. */
const PDF_PREVIEW_HASH = "#toolbar=0&navpanes=0&scrollbar=0&view=Fit";

type SellSheetPdfPanelProps = {
  data: SellSheetData;
  labels: SellSheetPdfLabels;
  downloadLabel: string;
  pdfPreviewLabel: string;
  loadingLabel: string;
};

type PdfRenderPayload = {
  data: SellSheetData;
  logoSize?: { width: number; height: number; objectFit?: "contain" };
};

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 48);
}

function PdfIframePreview({ url, title }: { url: string; title: string }) {
  return (
    <div
      className="sell-sheet-pdf-shell sell-sheet-pdf-shell--fitted"
      style={sellSheetDisplayStyle()}
    >
      <iframe
        src={`${url}${PDF_PREVIEW_HASH}`}
        title={title}
        className="sell-sheet-pdf-iframe"
        scrolling="no"
      />
    </div>
  );
}

function PdfLoadingShell({ label }: { label: string }) {
  return (
    <div
      className="sell-sheet-pdf-shell sell-sheet-pdf-shell--fitted flex items-center justify-center text-silver-600"
      style={sellSheetDisplayStyle()}
    >
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}

function PdfRenderError() {
  return (
    <div
      className="sell-sheet-pdf-shell flex items-center justify-center px-4 text-center text-sm text-red-700"
      style={sellSheetDisplayStyle()}
    >
      PDF preview failed to render. Try refreshing the page or switching back to
      the web preview and returning to PDF.
    </div>
  );
}

async function preparePdfPayload(data: SellSheetData): Promise<PdfRenderPayload> {
  if (!data.logoImage) {
    return { data };
  }

  try {
    const trimmed = await trimTransparentEdges(data.logoImage);
    const logoSize = scaleImageToFit(
      trimmed.width,
      trimmed.height,
      PDF_LOGO_MAX_WIDTH,
      PDF_LOGO_MAX_HEIGHT,
    );

    return {
      data: { ...data, logoImage: trimmed.src },
      logoSize,
    };
  } catch {
    return {
      data,
      logoSize: {
        width: PDF_LOGO_MAX_WIDTH,
        height: PDF_LOGO_MAX_HEIGHT,
      },
    };
  }
}

export function SellSheetPdfPanel({
  data,
  labels,
  downloadLabel,
  pdfPreviewLabel,
  loadingLabel,
}: SellSheetPdfPanelProps) {
  const dataKey = useMemo(() => sellSheetPdfPayloadKey(data), [data]);
  const [renderPayload, setRenderPayload] = useState<PdfRenderPayload | null>(
    null,
  );
  const [isPreparing, setIsPreparing] = useState(true);
  const activeKeyRef = useRef<string | null>(null);
  const loggedErrorRef = useRef<unknown>(null);

  const [pdfInstance, updatePdfDocument] = usePDF();

  useEffect(() => {
    registerSellSheetPdfFonts();
  }, []);

  useEffect(() => {
    let cancelled = false;
    activeKeyRef.current = dataKey;
    setIsPreparing(true);

    void preparePdfPayload(data).then((payload) => {
      if (cancelled || activeKeyRef.current !== dataKey) return;
      setRenderPayload(payload);
      setIsPreparing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [data, dataKey]);

  const labelsKey = useMemo(
    () =>
      JSON.stringify({
        paintSystemHeading: labels.paintSystemHeading,
        benefitsHeading: labels.benefitsHeading,
        warrantyHeading: labels.warrantyHeading,
        systemsGuide: labels.systemsGuide,
        applicationLabels: labels.applicationLabels,
        preparedByFooter: labels.preparedByFooter,
      }),
    [labels],
  );

  const pdfDocument = useMemo(() => {
    if (!renderPayload) return null;

    return (
      <SellSheetPdfDocument
        data={renderPayload.data}
        labels={labels}
        logoSize={renderPayload.logoSize}
      />
    );
    // labelsKey keeps document stable when label object identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderPayload, labelsKey]);

  useEffect(() => {
    if (pdfDocument) {
      updatePdfDocument(pdfDocument);
    }
  }, [pdfDocument, updatePdfDocument]);

  useEffect(() => {
    const { error } = pdfInstance;
    if (!error) {
      loggedErrorRef.current = null;
      return;
    }
    if (error === loggedErrorRef.current) return;
    loggedErrorRef.current = error;
    console.error("Sell sheet PDF render error:", error);
  }, [pdfInstance.error]);

  const filename = `${sanitizeFilename(data.companyName) || "sell-sheet"}-comparison.pdf`;
  const showPreparing = isPreparing && !renderPayload;
  const pdfLoading = pdfInstance.loading || !pdfInstance.url;
  const showPdfLoading = showPreparing || !pdfDocument || pdfLoading;
  const downloadReady = Boolean(pdfInstance.url && !pdfInstance.loading);

  return (
    <div className="sell-sheet-pdf-panel">
      {pdfDocument ? (
        <div className="sell-sheet-pdf-download">
          {downloadReady ? (
            <a
              href={pdfInstance.url ?? undefined}
              download={filename}
              className="btn-primary inline-flex px-5 py-2.5 text-sm shadow-md"
            >
              {downloadLabel}
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg border border-silver-400/40 bg-white/95 px-4 py-2 text-sm text-silver-600 shadow-md backdrop-blur-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingLabel}
            </span>
          )}
        </div>
      ) : null}

      <div
        className="sell-sheet-preview-stage sell-sheet-preview-stage--pdf"
        role="region"
        aria-label={pdfPreviewLabel}
      >
        {pdfInstance.error ? (
          <PdfRenderError />
        ) : showPdfLoading ? (
          <PdfLoadingShell label={loadingLabel} />
        ) : (
          <PdfIframePreview
            url={pdfInstance.url!}
            title={pdfPreviewLabel}
          />
        )}
      </div>
    </div>
  );
}
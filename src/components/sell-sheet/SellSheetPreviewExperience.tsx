"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ArrowLeft, FileText, LayoutTemplate, Loader2 } from "lucide-react";
import { SellSheetLanguageBar } from "@/components/sell-sheet/SellSheetLanguageBar";
import { SellSheetPreview } from "@/components/sell-sheet/SellSheetPreview";
import type { SellSheetApplicationLabels } from "@/lib/sell-sheet/utils";
import type { SellSheetData } from "@/types/sell-sheet";

const SellSheetPdfPanel = dynamic(
  () =>
    import("@/components/sell-sheet/SellSheetPdfPanel").then(
      (mod) => mod.SellSheetPdfPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[480px] items-center justify-center text-silver-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading PDF…
      </div>
    ),
  },
);

type PreviewTab = "web" | "pdf";

type SellSheetPreviewExperienceProps = {
  data: SellSheetData;
  onBack: () => void;
  backLabel: string;
  webTabLabel: string;
  pdfTabLabel: string;
  paintSystemHeading: string;
  benefitsHeading: string;
  warrantyHeading: string;
  systemsGuideLabel: string;
  applicationLabels: SellSheetApplicationLabels;
  preparedByFooter: string;
  downloadPdfLabel: string;
  pdfPreviewLabel: string;
  pdfLoadingLabel: string;
};

export function SellSheetPreviewExperience({
  data,
  onBack,
  backLabel,
  webTabLabel,
  pdfTabLabel,
  paintSystemHeading,
  benefitsHeading,
  warrantyHeading,
  systemsGuideLabel,
  applicationLabels,
  preparedByFooter,
  downloadPdfLabel,
  pdfPreviewLabel,
  pdfLoadingLabel,
}: SellSheetPreviewExperienceProps) {
  const [tab, setTab] = useState<PreviewTab>("web");
  const pdfLabels = useMemo(
    () => ({
      paintSystemHeading,
      benefitsHeading,
      warrantyHeading,
      systemsGuide: systemsGuideLabel,
      applicationLabels,
      preparedByFooter,
    }),
    [
      paintSystemHeading,
      benefitsHeading,
      warrantyHeading,
      systemsGuideLabel,
      applicationLabels.interior,
      applicationLabels.exterior,
      preparedByFooter,
    ],
  );

  return (
    <div
      className={`sell-sheet-preview-root${tab === "pdf" ? " sell-sheet-preview-root--pdf pt-3 lg:pt-4" : " pt-4 lg:pt-5"}`}
    >
      <div className="mb-4">
        <SellSheetLanguageBar />
      </div>

      <div className="sell-sheet-preview-toolbar flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-silver-200 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>

        <div
          className="inline-flex rounded-lg border border-silver-400/30 bg-navy-900/50 p-1"
          role="tablist"
          aria-label="Preview mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "web"}
            onClick={() => setTab("web")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              tab === "web"
                ? "bg-white text-navy-900 shadow-sm"
                : "text-silver-200 hover:text-white"
            }`}
          >
            <LayoutTemplate className="h-4 w-4" />
            {webTabLabel}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "pdf"}
            onClick={() => setTab("pdf")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              tab === "pdf"
                ? "bg-white text-navy-900 shadow-sm"
                : "text-silver-200 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            {pdfTabLabel}
          </button>
        </div>
      </div>

      {tab === "web" ? (
        <div
          className="sell-sheet-preview-stage sell-sheet-preview-stage--web"
          role="tabpanel"
        >
          <SellSheetPreview
            data={data}
            paintSystemHeading={paintSystemHeading}
            benefitsHeading={benefitsHeading}
            warrantyHeading={warrantyHeading}
            systemsGuideLabel={systemsGuideLabel}
            applicationLabels={applicationLabels}
            preparedByFooter={preparedByFooter}
          />
        </div>
      ) : (
        <div className="sell-sheet-preview-panel" role="tabpanel">
          <SellSheetPdfPanel
            data={data}
            labels={pdfLabels}
            downloadLabel={downloadPdfLabel}
            pdfPreviewLabel={pdfPreviewLabel}
            loadingLabel={pdfLoadingLabel}
          />
        </div>
      )}
    </div>
  );
}
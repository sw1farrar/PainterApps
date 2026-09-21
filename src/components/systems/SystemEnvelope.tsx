"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SnapshotJobButton } from "@/components/jobs/SnapshotJobButton";
import { Button } from "@/components/ui/button";
import { CanImage } from "@/components/systems/CanImage";
import {
  PdfPreviewModal,
  ProductStory,
  previewPdfUrl,
} from "@/components/systems/ProductStory";
import { formatTempRange, type UnitSystem } from "@/lib/units";
import type { JobOption } from "@/lib/jobs/list";
import type { Manufacturer, MatchedSystem, TdsProduct } from "@/lib/systems/types";

function sheetUrl(product: TdsProduct) {
  return (
    product.documents?.find((d) => d.publicUrl)?.publicUrl ??
    product.tdsUrl ??
    ""
  );
}

function storedPdf(product: TdsProduct) {
  return product.documents?.find((d) => d.stored && d.publicUrl)?.publicUrl ?? null;
}

export function SystemEnvelope({
  match,
  units,
  signedIn,
  jobs,
  onClose,
}: {
  match: MatchedSystem;
  units: UnitSystem;
  signedIn: boolean;
  jobs: JobOption[];
  onClose: () => void;
}) {
  const t = useTranslations("systems");
  const { system, manufacturer, primer, topcoat, midcoat } = match;
  const paperPdf = storedPdf(topcoat) ?? storedPdf(primer);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="envelope-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="envelope-panel flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="envelope-flap mx-auto w-[min(100%,42rem)] shrink-0" />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-2xl rounded-t-md border border-border bg-background shadow-2xl">
          <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 border-b border-border bg-background px-5 py-4 sm:px-8">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {manufacturer.name}
              </p>
              <h2
                id="envelope-title"
                className="mt-1 text-2xl font-semibold tracking-tight"
              >
                {system.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t("close")}
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-5 sm:px-8">
            <p className="text-sm">{system.prepNotes}</p>
            <ProductStory
              product={primer}
              manufacturer={manufacturer.name}
              units={units}
            />
            {midcoat ? (
              <ProductStory
                product={midcoat}
                manufacturer={manufacturer.name}
                units={units}
              />
            ) : null}
            <ProductStory
              product={topcoat}
              manufacturer={manufacturer.name}
              units={units}
            />
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {match.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                className="paint-gradient border-0 text-white"
                onClick={() =>
                  document
                    .getElementById("system-letter")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {t("letterSheet")}
              </Button>
              <SnapshotJobButton
                signedIn={signedIn}
                canSnapshot={signedIn}
                loginNext="/systems"
                kind="system"
                title={`${manufacturer.name} · ${system.name}`}
                payload={{
                  manufacturer: manufacturer.name,
                  system: system.name,
                  prep: system.prepNotes,
                  primer: {
                    name: primer.name,
                    tdsUrl: sheetUrl(primer),
                    tdsRevision: primer.tdsRevision,
                    tdsDate: primer.tdsDate,
                  },
                  topcoat: {
                    name: topcoat.name,
                    tdsUrl: sheetUrl(topcoat),
                    tdsRevision: topcoat.tdsRevision,
                    tdsDate: topcoat.tdsDate,
                  },
                  why: match.reasons[0] ?? "",
                }}
                label={t("snapshot")}
                jobs={jobs}
              />
            </div>
            <SystemLetterSheet
              match={match}
              units={units}
              paperPdf={paperPdf}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductEnvelope({
  product,
  manufacturer,
  usedIn,
  units,
  onClose,
}: {
  product: TdsProduct;
  manufacturer: Manufacturer;
  usedIn: MatchedSystem[];
  units: UnitSystem;
  onClose: () => void;
}) {
  const t = useTranslations("systems");
  const [preview, setPreview] = useState(false);
  const pdf = previewPdfUrl(product);
  const kicker = [
    manufacturer.name,
    product.kind,
    product.sku || null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="envelope-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="envelope-panel flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="envelope-flap mx-auto w-[min(100%,42rem)] shrink-0" />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-2xl rounded-t-md border border-border bg-background shadow-2xl">
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-5 py-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <CanImage src={product.canImageUrl} alt={product.name} size="lg" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {kicker}
                </p>
                <h2
                  id="envelope-title"
                  className="mt-1 text-2xl font-semibold tracking-tight"
                >
                  {product.name}
                </h2>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {pdf ? (
                <Button
                  className="paint-gradient border-0 text-white"
                  onClick={() => setPreview(true)}
                >
                  {t("productDataSheet")}
                </Button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {t("close")}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
            <ProductStory
              product={product}
              manufacturer={manufacturer.name}
              units={units}
              hideTitle
              hidePdf
            />
            {usedIn.length ? (
              <div className="mt-6">
                <p className="text-sm font-medium">{t("usedIn")}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {usedIn.map((r) => (
                    <li key={r.system.id}>{r.system.name}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {preview && pdf ? (
        <PdfPreviewModal
          url={pdf}
          title={`${manufacturer.name} ${product.name}`}
          onClose={() => setPreview(false)}
        />
      ) : null}
    </div>
  );
}

function SystemLetterSheet({
  match,
  units,
  paperPdf,
}: {
  match: MatchedSystem;
  units: UnitSystem;
  paperPdf: string | null;
}) {
  const t = useTranslations("systems");
  const { system, manufacturer, primer, topcoat, midcoat } = match;

  return (
    <div
      id="system-letter"
      className="border-t border-border bg-muted/30 px-3 py-8 sm:px-8"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 no-print">
        <p className="text-sm font-medium">{t("letterSheet")}</p>
        <div className="flex flex-wrap gap-2">
          {paperPdf ? (
            <>
              <Button asChild size="sm" variant="outline">
                <a href={paperPdf} download>
                  {t("downloadPdf")}
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={paperPdf} target="_blank" rel="noreferrer">
                  {t("printSheet")}
                </a>
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              {t("printSheet")}
            </Button>
          )}
        </div>
      </div>

      {paperPdf ? (
        <iframe
          title={t("pdfPreview")}
          src={paperPdf}
          className="letter-print mx-auto h-[11in] w-full max-w-[8.5in] rounded-sm border border-neutral-300 bg-white shadow-lg"
        />
      ) : (
        <div className="letter-print letter-sheet mx-auto bg-white text-neutral-950 shadow-lg">
          <style>{`
            .letter-sheet {
              width: 100%;
              max-width: 8.5in;
              min-height: 11in;
              padding: 0.7in 0.75in;
              box-sizing: border-box;
            }
            @page { size: letter; margin: 0.6in; }
            @media print {
              header, footer, nav, .no-print { display: none !important; }
              .letter-sheet { box-shadow: none; max-width: none; }
            }
          `}</style>
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            PainterApps
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">
            {manufacturer.name}
          </h3>
          <p className="text-lg">{system.name}</p>
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed">
            <p>
              <strong>{t("prep")}.</strong> {system.prepNotes}
            </p>
            <p>
              <strong>{t("primer")}.</strong> {primer.name} —{" "}
              {t("revision", {
                revision: primer.tdsRevision,
                date: primer.tdsDate,
              })}
            </p>
            {midcoat ? (
              <p>
                <strong>{t("midcoat")}.</strong> {midcoat.name}
              </p>
            ) : null}
            <p>
              <strong>{t("topcoat")}.</strong> {topcoat.name} —{" "}
              {t("revision", {
                revision: topcoat.tdsRevision,
                date: topcoat.tdsDate,
              })}
            </p>
            <p>
              <strong>{t("window")}.</strong>{" "}
              {formatTempRange(topcoat.minTempF, topcoat.maxTempF, units)}, RH ≤{" "}
              {topcoat.maxHumidityPct}%
            </p>
            <p>{match.reasons[0]}</p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EnvelopeSheet } from "@/components/systems/EnvelopeSheet";
import { formatTempRange, type UnitSystem } from "@/lib/units";
import type { TdsProduct } from "@/lib/systems/types";

export function previewPdfUrl(product: TdsProduct) {
  const stored = product.documents?.find((d) => d.stored && d.publicUrl)?.publicUrl;
  if (stored) return stored;
  const official = product.specs?.official_tds_pdf_url;
  if (typeof official === "string" && official) return official;
  const sheet = product.documents?.find((d) => d.publicUrl)?.publicUrl;
  if (sheet) return sheet;
  if (product.tdsUrl) return product.tdsUrl;
  return null;
}

function spec(product: TdsProduct, key: string) {
  const v = product.specs?.[key];
  if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return null;
  if (Array.isArray(v)) return v.map(String).join(", ");
  return String(v);
}

function Attr({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export function PdfPreviewModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const t = useTranslations("systems");
  return (
    <EnvelopeSheet onClose={onClose} ariaLabel={t("pdfPreview")} layer={60}>
      {(close) => (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-md border border-b-0 border-border bg-background shadow-2xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium">{title}</p>
            <div className="flex shrink-0 gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={url} download>
                  {t("downloadPdf")}
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={url} target="_blank" rel="noreferrer">
                  {t("printSheet")}
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={close}>
                {t("close")}
              </Button>
            </div>
          </div>
          <iframe
            title={t("pdfPreview")}
            src={url}
            className="w-full flex-1 bg-white"
            style={{ minHeight: 0 }}
          />
        </div>
      )}
    </EnvelopeSheet>
  );
}

export function ProductStory({
  product,
  manufacturer,
  units,
  hideTitle = false,
  hidePdf = false,
}: {
  product: TdsProduct;
  manufacturer: string;
  units: UnitSystem;
  hideTitle?: boolean;
  hidePdf?: boolean;
}) {
  const t = useTranslations("systems");
  const [preview, setPreview] = useState(false);
  const pdf = previewPdfUrl(product);
  const story = product.description || product.notes || "";
  const coverage =
    spec(product, "coverage_sqft_gal_min") && spec(product, "coverage_sqft_gal_max")
      ? `${spec(product, "coverage_sqft_gal_min")}–${spec(product, "coverage_sqft_gal_max")} sq ft/gal`
      : spec(product, "coverage_sqft_gal_min") || spec(product, "coverage_sqft_gal_max");
  const place = [
    product.interior ? t("interior") : null,
    product.exterior ? t("exterior") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      {hideTitle ? (
        story ? (
          <p className="text-sm leading-relaxed">{story}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noDescription")}</p>
        )
      ) : (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {manufacturer} · {product.kind}
            {product.sku ? ` · ${product.sku}` : ""}
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">
            {product.name}
          </h3>
          {story ? (
            <p className="mt-3 text-sm leading-relaxed">{story}</p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("noDescription")}
            </p>
          )}
        </div>
      )}

      {product.features && product.features.length > 0 ? (
        <div>
          <p className="text-sm font-medium">{t("features")}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {product.features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {product.benefits && product.benefits.length > 0 ? (
        <div>
          <p className="text-sm font-medium">{t("benefits")}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {product.benefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2">
        <Attr label={t("place")} value={place} />
        <Attr
          label={t("substrate")}
          value={product.substrates.join(", ") || null}
        />
        <Attr label={t("sheen")} value={product.sheens.join(", ") || null} />
        <Attr
          label="VOC"
          value={product.vocGL != null ? `${product.vocGL} g/L` : null}
        />
        <Attr
          label={t("window")}
          value={`${formatTempRange(product.minTempF, product.maxTempF, units)}, RH ≤ ${product.maxHumidityPct}%`}
        />
        <Attr
          label={t("rainReadyLabel")}
          value={
            product.rainReadyMinutes != null
              ? `${product.rainReadyMinutes} min`
              : spec(product, "rain_ready_conditions")
          }
        />
        <Attr
          label={t("recoatLabel")}
          value={
            product.recoatHours != null ? `${product.recoatHours} hr` : null
          }
        />
        <Attr label={t("coverage")} value={coverage} />
        <Attr
          label={t("solids")}
          value={
            spec(product, "volume_solids_pct")
              ? `${spec(product, "volume_solids_pct")}% vol`
              : null
          }
        />
        <Attr
          label={t("vehicle")}
          value={spec(product, "vehicle_type") || spec(product, "resin_type")}
        />
        <Attr label={t("cleanUp")} value={spec(product, "clean_up")} />
        <Attr label={t("tint")} value={spec(product, "tint_system")} />
        <Attr
          label={t("citation")}
          value={
            product.tdsRevision || product.tdsDate
              ? t("revision", {
                  revision: product.tdsRevision || "—",
                  date: product.tdsDate || "—",
                })
              : null
          }
        />
      </dl>

      {hidePdf ? null : pdf ? (
        <Button
          className="paint-gradient border-0 text-white"
          onClick={() => setPreview(true)}
        >
          {t("productDataSheet")}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noTds")}</p>
      )}

      {preview && pdf ? (
        <PdfPreviewModal
          url={pdf}
          title={`${manufacturer} ${product.name}`}
          onClose={() => setPreview(false)}
        />
      ) : null}
    </div>
  );
}

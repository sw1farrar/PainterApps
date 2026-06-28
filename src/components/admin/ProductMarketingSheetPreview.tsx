"use client";

import Image from "next/image";

import {
  PMS_LAYOUT_PX,
  productMarketingSheetDisplayStyle,
} from "@/lib/product-catalog/product-marketing-sheet-display-tokens";
import {
  buildProductMarketingSheetMetaPills,
  type ProductMarketingSheetView,
} from "@/lib/product-catalog/product-marketing-sheet";
import { isAbsoluteHttpUrl } from "@/lib/utils";

type ProductMarketingSheetPreviewProps = {
  view: ProductMarketingSheetView;
  className?: string;
};

function SpecList({
  items,
  emptyLabel,
  twoColumn = false,
}: {
  items: string[];
  emptyLabel: string;
  twoColumn?: boolean;
}) {
  if (items.length === 0) {
    return <p className="pms-empty">{emptyLabel}</p>;
  }

  return (
    <ul
      className={`pms-list${twoColumn ? " pms-list--two-column" : ""}`.trim()}
    >
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function ProductMarketingSheetPreview({
  view,
  className = "",
}: ProductMarketingSheetPreviewProps) {
  const metaPills = buildProductMarketingSheetMetaPills(view);
  const manufacturerLogoUrl = isAbsoluteHttpUrl(view.manufacturerLogoUrl)
    ? view.manufacturerLogoUrl
    : null;

  return (
    <article
      className={`product-marketing-sheet ${className}`.trim()}
      style={productMarketingSheetDisplayStyle()}
      aria-label={`${view.productName} marketing sheet`}
    >
      <header className="pms-header">
        <div className="pms-brand">
          {manufacturerLogoUrl ? (
            <div className="pms-manufacturer-logo-wrap">
              <Image
                src={manufacturerLogoUrl}
                alt={`${view.manufacturerName} logo`}
                width={PMS_LAYOUT_PX.logoMaxWidth}
                height={PMS_LAYOUT_PX.logoImageHeight}
                className="pms-manufacturer-logo"
                unoptimized
              />
            </div>
          ) : (
            <p className="pms-manufacturer">{view.manufacturerName}</p>
          )}
        </div>
        <div className="pms-header-aside">
          <h1 className="pms-product-name">{view.productName}</h1>
          <span className="pms-badge">{view.applicationLabel}</span>
        </div>
      </header>

      {view.isDiscontinued ? (
        <div className="pms-discontinued">Discontinued product</div>
      ) : null}

      <section className="pms-hero">
        <div className="pms-can-wrap">
          {view.canImageUrl ? (
            <Image
              src={view.canImageUrl}
              alt={`${view.productName} paint can`}
              width={PMS_LAYOUT_PX.canImageWidth}
              height={PMS_LAYOUT_PX.canImageHeight}
              className="pms-can-image"
              unoptimized
            />
          ) : (
            <p className="pms-can-placeholder">Can image not available</p>
          )}
        </div>

        <div className="pms-hero-copy">
          <div className="pms-meta-row">
            {metaPills.map((pill) => (
              <span key={pill} className="pms-pill">
                {pill}
              </span>
            ))}
          </div>

          {view.description ? (
            <p className="pms-description">{view.description}</p>
          ) : (
            <p className="pms-empty">
              Product description has not been added yet.
            </p>
          )}
        </div>
      </section>

      <section className="pms-columns">
        <div className="pms-panel">
          <h2 className="pms-section-title">Sheen options</h2>
          <SpecList items={view.sheenOptions} emptyLabel="No sheens listed." />
        </div>
        <div className="pms-panel">
          <h2 className="pms-section-title">Product capabilities</h2>
          <SpecList
            items={view.productCapabilities}
            emptyLabel="No capability flags listed."
            twoColumn
          />
        </div>
      </section>

      <section className="pms-columns">
        <div className="pms-panel">
          <h2 className="pms-section-title">Product uses</h2>
          <SpecList
            items={view.productUses}
            emptyLabel="No product uses listed."
            twoColumn
          />
        </div>
        <div className="pms-panel">
          <h2 className="pms-section-title">Substrates</h2>
          <SpecList
            items={view.substrates}
            emptyLabel="No substrates listed."
            twoColumn
          />
        </div>
      </section>

      {view.recommendedUses.length > 0 ? (
        <section className="pms-specs-block">
          <h2 className="pms-section-title">Recommended uses</h2>
          <SpecList
            items={view.recommendedUses}
            emptyLabel="No recommended uses listed."
            twoColumn
          />
        </section>
      ) : null}

      <section className="pms-columns">
        <div className="pms-panel">
          <h2 className="pms-section-title">Paint system features</h2>
          <SpecList
            items={view.paintSystemFeatures}
            emptyLabel="No paint system features listed."
            twoColumn
          />
        </div>
        <div className="pms-panel">
          <h2 className="pms-section-title">Coating specifications</h2>
          <SpecList
            items={view.paintSystemFeatureOptions}
            emptyLabel="No coating specifications listed."
            twoColumn
          />
        </div>
      </section>

      <section className="pms-meta-block">
        <div className="pms-meta-line">
            <span className="pms-meta-label">Catalog data status</span>
            <span className="pms-meta-value">{view.enrichmentStatus}</span>
          </div>
          {view.lastGatheredLabel ? (
            <div className="pms-meta-line">
              <span className="pms-meta-label">Last updated</span>
              <span className="pms-meta-value">{view.lastGatheredLabel}</span>
            </div>
          ) : null}
        {view.sourceUrl ? (
          <div className="pms-meta-line">
            <span className="pms-meta-label">Source</span>
            <a
              href={view.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pms-meta-link"
            >
              {view.sourceUrl}
            </a>
          </div>
        ) : null}
        {view.attributeSourceUrl ? (
          <div className="pms-meta-line">
            <span className="pms-meta-label">Attribute source</span>
            <a
              href={view.attributeSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pms-meta-link"
            >
              {view.attributeSourceUrl}
            </a>
          </div>
        ) : null}
      </section>

      <footer className="pms-footer">
        <span>PainterApps Product Catalog</span>
        <span>
          {view.manufacturerName} — {view.productName}
        </span>
      </footer>
    </article>
  );
}
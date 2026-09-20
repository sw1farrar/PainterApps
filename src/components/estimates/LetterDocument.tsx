import {
  displayWebsite,
  formatLetterDate,
  formatMoney,
  validThrough,
  type LetterArea,
  type LetterCompany,
  type LetterCustomer,
  type LetterEstimate,
  type LetterSurface,
} from "@/lib/estimates/letter";
import { cn } from "@/lib/utils";

function areaAmount(area: LetterArea) {
  return (area.estimate_surfaces ?? []).reduce((s, x) => s + Number(x.amount), 0);
}

function qtyBit(s: { qty: number; unit: string }) {
  const q = Number(s.qty);
  if (!q) return "";
  if (s.unit === "lnft_per_hr") return `${Math.round(q)} lnft`;
  if (s.unit === "hr_per_item") return `${q % 1 ? q.toFixed(1) : q}`;
  return `${Math.round(q)} sqft`;
}

export function LetterDocument({
  estimate,
  areas,
  customer,
  company,
  showHours,
  labels,
  onLetterheadClick,
  onCustomerClick,
  onRoomClick,
  onSurfaceClick,
  onAddRoom,
  onAddSurface,
}: {
  estimate: LetterEstimate;
  areas: LetterArea[];
  customer: LetterCustomer | null;
  company: LetterCompany;
  showHours: boolean;
  onLetterheadClick?: () => void;
  onCustomerClick?: () => void;
  onRoomClick?: (area: LetterArea) => void;
  onSurfaceClick?: (area: LetterArea, surface: LetterSurface) => void;
  onAddRoom?: () => void;
  onAddSurface?: (area: LetterArea) => void;
  labels: {
    estimate: string;
    preparedFor: string;
    jobSite: string;
    noCustomer: string;
    scope: string;
    coats: string;
    labor: string;
    materials: string;
    hours: string;
    total: string;
    terms: string;
    validFor: string;
    payment: string;
    exclusions: string;
    acceptedBy: string;
    date: string;
    forCompany: string;
    thankYou: string;
    license: string;
    addRoom: string;
    addSurface: string;
  };
}) {
  const accent = company.accent_color || "#0f766e";
  const totals = estimate.totals ?? {};
  const until = validThrough(estimate.created_at, company.proposal_valid_days);
  const site = [customer?.address, estimate.zip || customer?.zip]
    .filter(Boolean)
    .join(" · ");
  const contact = [company.phone, company.email, displayWebsite(company.website)]
    .filter(Boolean)
    .join("  ·  ");
  const cred = [
    company.license_number ? `${labels.license} ${company.license_number}` : "",
    company.insurance_line,
  ]
    .filter(Boolean)
    .join("  ·  ");
  const legal =
    company.legal_name &&
    company.legal_name !== company.company_name
      ? company.legal_name
      : "";

  return (
    <div
      className="letter-sheet mx-auto bg-white text-neutral-950"
      style={{ printColorAdjust: "exact" }}
    >
      <style>{`
        .letter-sheet {
          width: 100%;
          max-width: 8.5in;
          min-height: 11in;
          padding: 0.65in 0.7in 0.6in;
          box-sizing: border-box;
        }
        @page { size: letter; margin: 0.65in; }
        @media print {
          body { background: white !important; }
          header, footer, aside, nav, .no-print { display: none !important; }
          .letter-sheet { padding: 0; width: auto; min-height: auto; box-shadow: none; }
        }
      `}</style>

      <header
        className={cn(
          "flex items-start justify-between gap-6 pb-5",
          onLetterheadClick && "-mx-2 cursor-pointer rounded-sm px-2 py-1 hover:bg-neutral-50",
        )}
        onClick={onLetterheadClick}
      >
        <div className="flex min-w-0 items-start gap-3">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo_url}
              alt=""
              className="h-11 max-w-[7rem] object-contain object-left"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-neutral-950 sm:text-[26px]">
              {company.company_name || "Estimate"}
            </h1>
            {legal ? (
              <p className="text-[11px] text-neutral-500">{legal}</p>
            ) : null}
            {contact ? (
              <p className="mt-1 text-[11px] text-neutral-500">{contact}</p>
            ) : null}
            {company.address ? (
              <p className="text-[11px] text-neutral-500">{company.address}</p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">
            {labels.estimate}
          </p>
          <p className="mt-1 text-sm font-medium tabular-nums text-neutral-800">
            #{estimate.number}
          </p>
          <p className="mt-1 text-[13px] tabular-nums text-neutral-800">
            {formatLetterDate(estimate.created_at)}
          </p>
        </div>
      </header>

      <div className="h-[2px] w-full" style={{ backgroundColor: accent }} />
      {cred ? (
        <p className="pt-2 text-[10px] text-neutral-500">{cred}</p>
      ) : null}

      <section
        className={cn(
          "mt-7 flex flex-col gap-6 sm:flex-row sm:gap-10",
          onCustomerClick && "-mx-2 cursor-pointer rounded-sm px-2 py-1 hover:bg-neutral-50",
        )}
        onClick={onCustomerClick}
      >
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
            {labels.preparedFor}
          </p>
          {customer ? (
            <>
              <p className="text-[15px] font-medium text-neutral-950">{customer.name}</p>
              {customer.address ? (
                <p className="text-[12px] text-neutral-600">{customer.address}</p>
              ) : null}
              <p className="text-[12px] text-neutral-600">
                {[customer.phone, customer.email].filter(Boolean).join("  ·  ")}
              </p>
            </>
          ) : (
            <p className="text-[13px] italic text-neutral-400">{labels.noCustomer}</p>
          )}
        </div>
        <div className="min-w-0 sm:w-[45%]">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
            {labels.jobSite}
          </p>
          <p className="text-[15px] font-medium text-neutral-950">
            {site || "—"}
          </p>
        </div>
      </section>

      <section className="mt-7">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
          {labels.scope}
        </p>
        <div className="space-y-6">
          {areas.map((area) => (
            <div key={area.id}>
              <div
                className={cn(
                  "flex items-baseline justify-between gap-3",
                  onRoomClick && "-mx-1 cursor-pointer rounded-sm px-1 hover:bg-neutral-50",
                )}
                onClick={onRoomClick ? () => onRoomClick(area) : undefined}
              >
                <div>
                  <p className="text-[14px] font-medium text-neutral-950">{area.name}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {area.length}×{area.width}×{area.height}
                  </p>
                </div>
                <p className="text-[14px] font-medium tabular-nums">
                  {formatMoney(areaAmount(area))}
                </p>
              </div>
              <ul className="mt-1">
                {(area.estimate_surfaces ?? []).map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      "flex items-baseline gap-2 py-[3px] text-[12.5px] leading-snug",
                      onSurfaceClick && "cursor-pointer rounded-sm hover:bg-neutral-50",
                    )}
                    onClick={
                      onSurfaceClick ? () => onSurfaceClick(area, s) : undefined
                    }
                  >
                    <span className="min-w-0">
                      {s.label}, {s.coats} {labels.coats}
                      <span className="text-neutral-500">
                        {qtyBit(s) ? ` · ${qtyBit(s)}` : ""}
                        {showHours
                          ? ` · ${(Number(s.hours_paint) + Number(s.hours_prep)).toFixed(1)}h`
                          : ""}
                      </span>
                    </span>
                    <span className="mx-1 min-w-[1rem] flex-1 translate-y-[-0.35em] border-b border-dotted border-neutral-300" />
                    <span className="shrink-0 tabular-nums text-neutral-800">
                      {formatMoney(Number(s.amount))}
                    </span>
                  </li>
                ))}
              </ul>
              {onAddSurface ? (
                <button
                  type="button"
                  className="mt-1 text-[12px] text-neutral-500 hover:underline"
                  onClick={() => onAddSurface(area)}
                >
                  + {labels.addSurface}
                </button>
              ) : null}
            </div>
          ))}
          {onAddRoom ? (
            <button
              type="button"
              className="text-[12px] text-neutral-500 hover:underline"
              onClick={onAddRoom}
            >
              + {labels.addRoom}
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-8 border-t border-neutral-300 pt-5">
        <div className="ml-auto w-full max-w-[2.6in] space-y-1.5 text-[13px]">
          {showHours ? (
            <p className="flex justify-between gap-6 text-[12px] text-neutral-500">
              <span>{labels.hours}</span>
              <span className="tabular-nums">{Number(totals.hours ?? 0).toFixed(1)}</span>
            </p>
          ) : null}
          <p className="flex justify-between gap-6">
            <span>{labels.labor}</span>
            <span className="tabular-nums">{formatMoney(Number(totals.labor ?? 0))}</span>
          </p>
          <p className="flex justify-between gap-6">
            <span>{labels.materials}</span>
            <span className="tabular-nums">{formatMoney(Number(totals.material ?? 0))}</span>
          </p>
          <div className="mt-2 border-t border-neutral-950 pt-2.5">
            <div className="flex items-end justify-between gap-6">
              <span className="text-[11px] uppercase tracking-[0.18em]">{labels.total}</span>
              <span className="text-[28px] font-semibold tabular-nums tracking-[-0.03em]">
                {formatMoney(Number(totals.total ?? 0))}
              </span>
            </div>
            <div
              className="ml-auto mt-1.5 h-[3px] w-[3.2rem]"
              style={{ backgroundColor: accent }}
            />
          </div>
        </div>
      </section>

      <section className="mt-8 max-w-[5.8in] text-[11px] leading-[1.55] text-neutral-600">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
          {labels.terms}
        </p>
        <p>
          {labels.validFor} ({formatLetterDate(until)}).
        </p>
        {company.payment_terms ? (
          <p className="mt-2">
            {labels.payment} {company.payment_terms}
          </p>
        ) : null}
        {company.exclusions ? (
          <p className="mt-2">
            {labels.exclusions} {company.exclusions}
          </p>
        ) : null}
        {estimate.notes ? <p className="mt-2">{estimate.notes}</p> : null}
      </section>

      <section className="mt-10">
        <p className="text-[12px] italic text-neutral-500">{labels.thankYou}</p>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-[11px] text-neutral-500">{labels.acceptedBy}</p>
            <div className="mt-6 h-8 border-b border-neutral-400" />
            <p className="mt-3 text-[11px] text-neutral-500">{labels.date}</p>
            <div className="mt-4 h-8 w-32 border-b border-neutral-400" />
          </div>
          <div>
            <p className="text-[11px] text-neutral-500">
              {labels.forCompany} {company.company_name || ""}
            </p>
            <div className="mt-6 h-8 border-b border-neutral-400" />
          </div>
        </div>
      </section>
    </div>
  );
}

export function letterLabels(
  t: (key: string, values?: Record<string, string | number>) => string,
  days = 30,
) {
  return {
    estimate: t("estimateNo"),
    preparedFor: t("preparedFor"),
    jobSite: t("jobSite"),
    noCustomer: t("noCustomerYet"),
    scope: t("scopeOfWork"),
    coats: t("coats"),
    labor: t("labor"),
    materials: t("materials"),
    hours: t("hours"),
    total: t("total"),
    terms: t("notesTerms"),
    validFor: t("validForDays", { days }),
    payment: t("paymentTermsLabel"),
    exclusions: t("exclusionsLabel"),
    acceptedBy: t("acceptedBy"),
    date: t("date"),
    forCompany: t("forCompany"),
    thankYou: t("thankYouPaint"),
    license: t("licenseNo"),
    addRoom: t("addRoom"),
    addSurface: t("addSurface"),
  };
}

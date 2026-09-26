"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CanImage } from "@/components/systems/CanImage";
import { QualityFacts, QualityMark } from "@/components/systems/QualityMark";
import { applicationClass, type ApplicationClass } from "@/lib/systems/quality";
import { ProductEnvelope } from "@/components/systems/SystemEnvelope";
import type { Catalog } from "@/lib/systems/corpus-catalog";
import {
  allManufacturers,
  matchProducts,
  matchSystems,
} from "@/lib/systems/match";
import { formatTempRange, type UnitSystem } from "@/lib/units";
import { cn } from "@/lib/utils";
import type { JobOption } from "@/lib/jobs/list";
import {
  APPLICATION_TYPES,
  SHEENS,
  SUBSTRATES,
  type ApplicationType,
  type CoatRole,
  type MatchQuery,
  type Manufacturer,
  type MatchedSystem,
  type Sheen,
  type Substrate,
  type TdsProduct,
} from "@/lib/systems/types";

export function SystemWizard({
  units = "imperial",
}: {
  signedIn?: boolean;
  units?: UnitSystem;
  jobs?: JobOption[];
}) {
  const t = useTranslations("systems");
  const [role, setRole] = useState<CoatRole>("all");
  const [interior, setInterior] = useState(false);
  const [exterior, setExterior] = useState(true);
  const [apps, setApps] = useState<ApplicationType[]>([]);
  const [subs, setSubs] = useState<Substrate[]>([]);
  const [sheens, setSheens] = useState<Sheen[]>([]);
  const [voc, setVoc] = useState(false);
  const [mfrs, setMfrs] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Catalog | undefined>(undefined);
  const [openCoat, setOpenCoat] = useState<{
    product: TdsProduct;
    manufacturer: Manufacturer;
    usedIn: MatchedSystem[];
  } | null>(null);

  useEffect(() => {
    void fetch("/api/tds")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Catalog | null) => {
        if (data?.products?.length) setCatalog(data);
      })
      .catch(() => undefined);
  }, []);

  const query: MatchQuery = {
    interior,
    exterior,
    applicationTypes: apps,
    substrates: subs,
    sheens,
    vocSensitive: voc,
    manufacturerIds: mfrs,
  };

  const results = useMemo(
    () => matchProducts(query, catalog, role),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interior, exterior, apps, subs, sheens, voc, mfrs, catalog, role],
  );

  function hits(next: MatchQuery) {
    if (!catalog) return true;
    return matchProducts(next, catalog, role).length > 0;
  }

  const rest: MatchQuery = {
    applicationTypes: apps,
    substrates: subs,
    sheens,
    vocSensitive: voc,
    manufacturerIds: mfrs,
  };

  function viableInterior() {
    return hits({ ...rest, interior: true, exterior: false });
  }
  function viableExterior() {
    return hits({ ...rest, interior: false, exterior: true });
  }
  function viableApp(id: ApplicationType) {
    return hits({ ...query, applicationTypes: [id] });
  }
  function viableSubstrate(id: Substrate) {
    return hits({
      interior,
      exterior,
      applicationTypes: apps,
      sheens,
      vocSensitive: voc,
      manufacturerIds: mfrs,
      substrates: [id],
    });
  }
  function viableSheen(id: Sheen) {
    return hits({
      interior,
      exterior,
      applicationTypes: apps,
      substrates: subs,
      vocSensitive: voc,
      manufacturerIds: mfrs,
      sheens: [id],
    });
  }
  function viableVoc(want: boolean) {
    return hits({ ...query, vocSensitive: want });
  }
  function viableMfr(id: string) {
    return hits({
      interior,
      exterior,
      applicationTypes: apps,
      substrates: subs,
      sheens,
      vocSensitive: voc,
      manufacturerIds: [id],
    });
  }

  useEffect(() => {
    if (!catalog) return;
    const nextApps = apps.filter((id) => viableApp(id));
    const nextSubs = subs.filter((id) => viableSubstrate(id));
    const nextSheens = sheens.filter((id) => viableSheen(id));
    const nextMfrs = mfrs.filter((id) => viableMfr(id));
    const nextVoc = voc && viableVoc(true);
    if (nextApps.length !== apps.length) setApps(nextApps);
    if (nextSubs.length !== subs.length) setSubs(nextSubs);
    if (nextSheens.length !== sheens.length) setSheens(nextSheens);
    if (nextMfrs.length !== mfrs.length) setMfrs(nextMfrs);
    if (voc && !nextVoc) setVoc(false);
    if (interior && !viableInterior()) setInterior(false);
    if (exterior && !viableExterior()) setExterior(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interior, exterior, apps, subs, sheens, voc, mfrs, catalog, role]);

  function showProduct(product: TdsProduct, manufacturer: Manufacturer) {
    setOpenCoat({
      product,
      manufacturer,
      usedIn: catalog
        ? matchSystems(query, catalog).filter(
            (r) =>
              r.primer.id === product.id ||
              r.topcoat.id === product.id ||
              r.midcoat?.id === product.id,
          )
        : [],
    });
  }
  const narrowed =
    apps.length + subs.length + sheens.length + mfrs.length > 0 || voc;
  const listCount = results.length;
  const grouped =
    new Set(results.map((row) => applicationClass(row.product))).size > 1;

  useEffect(() => {
    if (!openCoat) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenCoat(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [openCoat]);

  function reset() {
    setInterior(false);
    setExterior(true);
    setRole("all");
    setApps([]);
    setSubs([]);
    setSheens([]);
    setVoc(false);
    setMfrs([]);
  }

  function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  return (
    <div className="space-y-3">
      <div className="-mx-4 space-y-1.5 border-b border-border/80 bg-background/90 px-4 py-2 md:sticky md:top-14 md:z-20 md:backdrop-blur">
        <FilterRow label={t("coat")}>
          <Chip
            selected={role === "all"}
            onClick={() => {
              setRole("all");
              setOpenCoat(null);
            }}
          >
            {t("roleAll")}
          </Chip>
          <Chip
            selected={role === "primer"}
            onClick={() => {
              setRole("primer");
              setOpenCoat(null);
            }}
          >
            {t("primer")}
          </Chip>
          <Chip
            selected={role === "topcoat"}
            onClick={() => {
              setRole("topcoat");
              setOpenCoat(null);
            }}
          >
            {t("topcoat")}
          </Chip>
        </FilterRow>

        <FilterRow label={t("where")}>
          <Chip
            selected={interior}
            disabled={!interior && !viableInterior()}
            onClick={() => {
              setInterior((v) => {
                const next = !v;
                if (!next && !exterior) setExterior(true);
                return next;
              });
            }}
          >
            {t("interior")}
          </Chip>
          <Chip
            selected={exterior}
            disabled={!exterior && !viableExterior()}
            onClick={() => {
              setExterior((v) => {
                const next = !v;
                if (!next && !interior) setInterior(true);
                return next;
              });
            }}
          >
            {t("exterior")}
          </Chip>
        </FilterRow>

        <FilterRow label={t("application")}>
          <Chip selected={apps.length === 0} onClick={() => setApps([])}>
            {t("any")}
          </Chip>
          {APPLICATION_TYPES.filter(
            (id) => apps.includes(id) || viableApp(id),
          ).map((id) => (
            <Chip
              key={id}
              selected={apps.includes(id)}
              onClick={() => toggle(apps, id, setApps)}
            >
              {t(`applications.${id}`)}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={t("substrate")}>
          <Chip selected={subs.length === 0} onClick={() => setSubs([])}>
            {t("any")}
          </Chip>
          {SUBSTRATES.map((id) => (
            <Chip
              key={id}
              selected={subs.includes(id)}
              disabled={!subs.includes(id) && !viableSubstrate(id)}
              onClick={() => toggle(subs, id, setSubs)}
            >
              {t(`substrates.${id}`)}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={t("sheen")}>
          <Chip selected={sheens.length === 0} onClick={() => setSheens([])}>
            {t("any")}
          </Chip>
          {SHEENS.map((id) => (
            <Chip
              key={id}
              selected={sheens.includes(id)}
              disabled={!sheens.includes(id) && !viableSheen(id)}
              onClick={() => toggle(sheens, id, setSheens)}
            >
              {t(`sheens.${id}`)}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={t("voc")}>
          <Chip selected={!voc} onClick={() => setVoc(false)}>
            {t("vocNo")}
          </Chip>
          <Chip
            selected={voc}
            disabled={!voc && !viableVoc(true)}
            onClick={() => setVoc(true)}
          >
            {t("vocYes")}
          </Chip>
        </FilterRow>

        <FilterRow label={t("manufacturer")}>
          <Chip selected={mfrs.length === 0} onClick={() => setMfrs([])}>
            {t("allManufacturers")}
          </Chip>
          {allManufacturers(catalog).map((m) => (
            <Chip
              key={m.id}
              selected={mfrs.includes(m.id)}
              disabled={!mfrs.includes(m.id) && !viableMfr(m.id)}
              onClick={() => toggle(mfrs, m.id, setMfrs)}
            >
              {m.name}
            </Chip>
          ))}
        </FilterRow>
        {narrowed ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={reset}
              className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {t("clearFilters")}
            </button>
          </div>
        ) : null}
      </div>

      {listCount === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {results.map((c, index) => {
            const application = applicationClass(c.product);
            const previous = index > 0 ? applicationClass(results[index - 1].product) : null;
            const showClass = grouped && application !== previous;
            return (
              <li key={c.product.id}>
                {showClass ? (
                  <p className="bg-muted/40 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {t(`qualityClasses.${application as ApplicationClass}`)}
                  </p>
                ) : null}
                <ProductRow
                  product={c.product}
                  manufacturer={c.manufacturer}
                  units={units}
                  onOpen={() => showProduct(c.product, c.manufacturer)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {openCoat ? (
        <ProductEnvelope
          product={openCoat.product}
          manufacturer={openCoat.manufacturer}
          usedIn={openCoat.usedIn}
          units={units}
          onClose={() => setOpenCoat(null)}
        />
      ) : null}
    </div>
  );
}

function lightDescription(text?: string) {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentence = clean.split(/(?<=[.!?])\s+/)[0] ?? clean;
  if (sentence.length <= 168) return sentence;
  const cut = sentence.slice(0, 165);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 90 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function ProductRow({
  product,
  manufacturer,
  units,
  onOpen,
}: {
  product: TdsProduct;
  manufacturer: Manufacturer;
  units: UnitSystem;
  onOpen: () => void;
}) {
  const t = useTranslations("systems");
  const summary = lightDescription(product.qualitySummary || product.description);
  const meta = [
    product.kind === "primer"
      ? t("primer")
      : product.kind === "topcoat"
        ? t("topcoat")
        : product.kind,
    product.sku,
    formatTempRange(product.minTempF, product.maxTempF, units),
  ].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start gap-3.5 px-3.5 py-3.5 text-left transition hover:bg-muted/40"
    >
      <CanImage src={product.canImageUrl} alt={product.name} size="md" className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {manufacturer.name}
            </span>
            <span className="mt-0.5 block text-[15px] font-medium leading-snug tracking-tight">
              {product.name}
            </span>
          </span>
          <QualityMark product={product} />
        </span>
        {summary ? (
          <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
            {summary}
          </span>
        ) : null}
        <QualityFacts product={product} />
        <span className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{meta.join(" · ")}</span>
          <span className="ml-auto shrink-0 underline-offset-4 group-hover:underline">
            {t("open")}
          </span>
        </span>
      </span>
    </button>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <p className="w-16 shrink-0 pt-1 text-[10px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-6 rounded-md border px-2 text-[11px] leading-none transition",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-primary/45",
        disabled &&
          !selected &&
          "cursor-not-allowed opacity-40 hover:border-border",
      )}
    >
      {children}
    </button>
  );
}

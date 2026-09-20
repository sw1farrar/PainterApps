"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CanImage } from "@/components/systems/CanImage";
import {
  ProductEnvelope,
  SystemEnvelope,
} from "@/components/systems/SystemEnvelope";
import type { Catalog } from "@/lib/systems/corpus-catalog";
import { allManufacturers, matchSystems } from "@/lib/systems/match";
import { formatTempRange, type UnitSystem } from "@/lib/units";
import { cn } from "@/lib/utils";
import type { JobOption } from "@/lib/jobs/list";
import {
  APPLICATION_TYPES,
  type ApplicationType,
  type MatchQuery,
  type Manufacturer,
  type MatchedSystem,
  type Sheen,
  type Substrate,
  type TdsProduct,
} from "@/lib/systems/types";

type CoatRole = "all" | "primer" | "topcoat";

const SUBSTRATES: Substrate[] = [
  "drywall",
  "wood",
  "masonry",
  "stucco",
  "metal",
  "previously-painted",
  "concrete-floor",
];
const SHEENS: Sheen[] = ["flat", "eggshell", "satin", "semi-gloss", "gloss"];

export function SystemWizard({
  signedIn,
  units = "imperial",
  jobs = [],
}: {
  signedIn: boolean;
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
  const [openId, setOpenId] = useState<string | null>(null);
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
    () => matchSystems(query, catalog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interior, exterior, apps, subs, sheens, voc, mfrs, catalog],
  );

  function hits(next: MatchQuery) {
    return matchSystems(next, catalog).length > 0;
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
  }, [interior, exterior, apps, subs, sheens, voc, mfrs, catalog]);

  const coats = useMemo(() => {
    if (role === "all") return [];
    const seen = new Map<
      string,
      { product: TdsProduct; manufacturer: Manufacturer; usedIn: MatchedSystem[] }
    >();
    for (const r of results) {
      const product = role === "primer" ? r.primer : r.topcoat;
      const cur = seen.get(product.id);
      if (cur) cur.usedIn.push(r);
      else {
        seen.set(product.id, {
          product,
          manufacturer: r.manufacturer,
          usedIn: [r],
        });
      }
    }
    return [...seen.values()];
  }, [role, results]);

  const selected = results.find((r) => r.system.id === openId) ?? null;

  function showProduct(product: TdsProduct, manufacturer: Manufacturer) {
    setOpenId(null);
    setOpenCoat({
      product,
      manufacturer,
      usedIn: results.filter(
        (r) =>
          r.primer.id === product.id ||
          r.topcoat.id === product.id ||
          r.midcoat?.id === product.id,
      ),
    });
  }
  const narrowed =
    apps.length + subs.length + sheens.length + mfrs.length > 0 || voc;
  const listCount = role === "all" ? results.length : coats.length;
  const countLabel =
    role === "primer"
      ? t("primerCount", { n: listCount })
      : role === "topcoat"
        ? t("topcoatCount", { n: listCount })
        : t("systemCount", { n: listCount });

  useEffect(() => {
    if (!openId && !openCoat) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenId(null);
        setOpenCoat(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [openId, openCoat]);

  function reset() {
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
    <div className="space-y-8">
      <div className="space-y-5">
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
              setOpenId(null);
              setOpenCoat(null);
            }}
          >
            {t("primer")}
          </Chip>
          <Chip
            selected={role === "topcoat"}
            onClick={() => {
              setRole("topcoat");
              setOpenId(null);
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
            onClick={() => setInterior((v) => !v)}
          >
            {t("interior")}
          </Chip>
          <Chip
            selected={exterior}
            disabled={!exterior && !viableExterior()}
            onClick={() => setExterior((v) => !v)}
          >
            {t("exterior")}
          </Chip>
        </FilterRow>

        <FilterRow label={t("application")}>
          <Chip selected={apps.length === 0} onClick={() => setApps([])}>
            {t("any")}
          </Chip>
          {APPLICATION_TYPES.map((id) => (
            <Chip
              key={id}
              selected={apps.includes(id)}
              disabled={!apps.includes(id) && !viableApp(id)}
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
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">{countLabel}</p>
        {narrowed ? (
          <button
            type="button"
            onClick={reset}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>

      {listCount === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : role === "all" ? (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {results.map((r) => (
            <li key={r.system.id}>
              <SystemRow
                match={r}
                units={units}
                onOpen={() => {
                  setOpenCoat(null);
                  setOpenId(r.system.id);
                }}
                onOpenProduct={showProduct}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {coats.map((c) => (
            <li key={c.product.id}>
              <ProductRow
                product={c.product}
                manufacturer={c.manufacturer}
                units={units}
                onOpen={() => showProduct(c.product, c.manufacturer)}
              />
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <SystemEnvelope
          match={selected}
          units={units}
          signedIn={signedIn}
          jobs={jobs}
          onClose={() => setOpenId(null)}
        />
      ) : null}
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
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-muted/50"
    >
      <CanImage src={product.canImageUrl} alt={product.name} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {manufacturer.name}
        </span>
        <span className="mt-0.5 block text-base font-medium">{product.name}</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {product.kind === "primer" ? t("primer") : t("topcoat")}
          {product.sku ? ` · ${product.sku}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatTempRange(product.minTempF, product.maxTempF, units)}
        <span className="ml-3 underline underline-offset-4">{t("open")}</span>
      </span>
    </button>
  );
}

function SystemRow({
  match,
  units,
  onOpen,
  onOpenProduct,
}: {
  match: MatchedSystem;
  units: UnitSystem;
  onOpen: () => void;
  onOpenProduct: (product: TdsProduct, manufacturer: Manufacturer) => void;
}) {
  const t = useTranslations("systems");
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-muted/50">
      <span className="flex shrink-0 items-end -space-x-2">
        <button
          type="button"
          className="rounded-sm"
          onClick={() => onOpenProduct(match.primer, match.manufacturer)}
          aria-label={match.primer.name}
        >
          <CanImage src={match.primer.canImageUrl} alt={match.primer.name} size="sm" />
        </button>
        <button
          type="button"
          className="rounded-sm"
          onClick={() => onOpenProduct(match.topcoat, match.manufacturer)}
          aria-label={match.topcoat.name}
        >
          <CanImage src={match.topcoat.canImageUrl} alt={match.topcoat.name} size="md" />
        </button>
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {match.manufacturer.name}
        </span>
        <span className="mt-0.5 block text-base font-medium">
          {match.system.name}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          <span
            className="underline-offset-4 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProduct(match.primer, match.manufacturer);
            }}
          >
            {match.primer.name}
          </span>
          {" · "}
          <span
            className="underline-offset-4 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProduct(match.topcoat, match.manufacturer);
            }}
          >
            {match.topcoat.name}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 text-xs text-muted-foreground"
      >
        {formatTempRange(
          match.topcoat.minTempF,
          match.topcoat.maxTempF,
          units,
        )}
        <span className="ml-3 underline underline-offset-4">{t("open")}</span>
      </button>
    </div>
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
    <div className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-start">
      <p className="pt-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
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
        "h-9 rounded-full border px-3.5 text-sm transition",
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

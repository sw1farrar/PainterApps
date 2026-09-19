"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SnapshotJobButton } from "@/components/jobs/SnapshotJobButton";
import { allManufacturers, matchSystems } from "@/lib/systems/match";
import { formatTempRange, type UnitSystem } from "@/lib/units";
import type {
  FailureMode,
  MatchQuery,
  Sheen,
  Substrate,
  Traffic,
} from "@/lib/systems/types";

const SUBSTRATES: Substrate[] = [
  "drywall",
  "wood",
  "masonry",
  "stucco",
  "metal",
  "previously-painted",
  "concrete-floor",
];
const FAILURES: FailureMode[] = [
  "none",
  "peeling",
  "chalking",
  "tannin",
  "efflorescence",
  "rust",
];
const SHEENS: Sheen[] = ["flat", "eggshell", "satin", "semi-gloss", "gloss"];
const TRAFFIC: Traffic[] = ["low", "medium", "high", "exterior-exposed"];

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
        selected
          ? "border-primary bg-accent text-accent-foreground"
          : "border-border hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

export function SystemWizard({
  signedIn,
  units = "imperial",
  jobs = [],
}: {
  signedIn: boolean;
  units?: UnitSystem;
  jobs?: { id: string; title: string; zip: string | null }[];
}) {
  const t = useTranslations("systems");
  const cta = useTranslations("cta");
  const [step, setStep] = useState(0);
  const [exterior, setExterior] = useState(true);
  const [substrate, setSubstrate] = useState<Substrate>("wood");
  const [failure, setFailure] = useState<FailureMode>("none");
  const [sheen, setSheen] = useState<Sheen | undefined>(undefined);
  const [traffic, setTraffic] = useState<Traffic>("medium");
  const [voc, setVoc] = useState(false);
  const [mfr, setMfr] = useState<string>("");
  const [ran, setRan] = useState(false);

  const query: MatchQuery = {
    interior: !exterior,
    exterior,
    substrate,
    failureMode: failure,
    sheen,
    traffic,
    vocSensitive: voc,
    manufacturerId: mfr || undefined,
  };

  const results = useMemo(
    () => (ran ? matchSystems(query) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ran, exterior, substrate, failure, sheen, traffic, voc, mfr],
  );

  const steps = 6;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        {t("stepOf", { current: Math.min(step + 1, steps), total: steps })}
      </p>

      {step === 0 && (
        <section>
          <h2 className="text-lg font-medium">{t("where")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Choice selected={!exterior} onClick={() => setExterior(false)}>
              {t("interior")}
            </Choice>
            <Choice selected={exterior} onClick={() => setExterior(true)}>
              {t("exterior")}
            </Choice>
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2 className="text-lg font-medium">{t("substrate")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SUBSTRATES.map((s) => (
              <Choice
                key={s}
                selected={substrate === s}
                onClick={() => setSubstrate(s)}
              >
                {t(`substrates.${s}`)}
              </Choice>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="text-lg font-medium">{t("condition")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FAILURES.map((f) => (
              <Choice
                key={f}
                selected={failure === f}
                onClick={() => setFailure(f)}
              >
                {t(`failure.${f}`)}
              </Choice>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 className="text-lg font-medium">{t("sheen")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SHEENS.map((s) => (
              <Choice
                key={s}
                selected={sheen === s}
                onClick={() => setSheen(s)}
              >
                {t(`sheens.${s}`)}
              </Choice>
            ))}
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-medium">{t("traffic")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {TRAFFIC.map((x) => (
                <Choice
                  key={x}
                  selected={traffic === x}
                  onClick={() => setTraffic(x)}
                >
                  {t(`trafficOpts.${x}`)}
                </Choice>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-medium">{t("voc")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Choice selected={voc} onClick={() => setVoc(true)}>
                {t("vocYes")}
              </Choice>
              <Choice selected={!voc} onClick={() => setVoc(false)}>
                {t("vocNo")}
              </Choice>
            </div>
          </div>
        </section>
      )}

      {step === 5 && (
        <section>
          <h2 className="text-lg font-medium">{t("manufacturer")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Choice selected={mfr === ""} onClick={() => setMfr("")}>
              {t("allManufacturers")}
            </Choice>
            {allManufacturers().map((m) => (
              <Choice
                key={m.id}
                selected={mfr === m.id}
                onClick={() => setMfr(m.id)}
              >
                {m.name}
              </Choice>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-3">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            {cta("back")}
          </Button>
        ) : null}
        {step < 5 ? (
          <Button onClick={() => setStep((s) => s + 1)}>
            {cta("next")}
          </Button>
        ) : (
          <Button
            className="paint-gradient border-0 text-white"
            onClick={() => setRan(true)}
          >
            {t("resultsTitle")}
          </Button>
        )}
      </div>

      {ran ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("resultsTitle")}</h2>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          ) : (
            results.map((r) => (
              <Card key={r.system.id}>
                <CardHeader>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {r.manufacturer.name}
                  </p>
                  <CardTitle>{r.system.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    <span className="font-medium">{t("prep")}: </span>
                    {r.system.prepNotes}
                  </p>
                  <ProductLine
                    label={t("primer")}
                    product={r.primer}
                    manufacturer={r.manufacturer.name}
                    revisionLabel={t("revision", {
                      revision: r.primer.tdsRevision,
                      date: r.primer.tdsDate,
                    })}
                    openLabel={t("openTds")}
                  />
                  <ProductLine
                    label={t("topcoat")}
                    product={r.topcoat}
                    manufacturer={r.manufacturer.name}
                    revisionLabel={t("revision", {
                      revision: r.topcoat.tdsRevision,
                      date: r.topcoat.tdsDate,
                    })}
                    openLabel={t("openTds")}
                  />
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {t("why")}:{" "}
                    </span>
                    {r.reasons[0]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("window")}:{" "}
                    {formatTempRange(
                      r.topcoat.minTempF,
                      r.topcoat.maxTempF,
                      units,
                    )}
                    , RH ≤ {r.topcoat.maxHumidityPct}%
                  </p>
                  <SnapshotJobButton
                    signedIn={signedIn}
                    loginNext="/systems"
                    kind="system"
                    title={`${r.manufacturer.name} · ${r.system.name}`}
                    payload={{
                      manufacturer: r.manufacturer.name,
                      system: r.system.name,
                      prep: r.system.prepNotes,
                      primer: {
                        name: r.primer.name,
                        tdsUrl: r.primer.tdsUrl,
                        tdsRevision: r.primer.tdsRevision,
                        tdsDate: r.primer.tdsDate,
                      },
                      topcoat: {
                        name: r.topcoat.name,
                        tdsUrl: r.topcoat.tdsUrl,
                        tdsRevision: r.topcoat.tdsRevision,
                        tdsDate: r.topcoat.tdsDate,
                      },
                      why: r.reasons[0] ?? "",
                    }}
                    label={t("snapshot")}
                    jobs={jobs}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProductLine({
  label,
  product,
  manufacturer,
  revisionLabel,
  openLabel,
}: {
  label: string;
  product: {
    name: string;
    tdsUrl: string;
    tdsRevision: string;
    tdsDate: string;
  };
  manufacturer: string;
  revisionLabel: string;
  openLabel: string;
}) {
  return (
    <p>
      <span className="font-medium">{label}: </span>
      {manufacturer} {product.name}{" "}
      <span className="text-muted-foreground">({revisionLabel})</span>{" "}
      <a
        href={product.tdsUrl}
        className="underline underline-offset-4"
        target="_blank"
        rel="noreferrer"
      >
        {openLabel}
      </a>
    </p>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SnapshotJobButton } from "@/components/jobs/SnapshotJobButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateCoverage,
  POROSITY_MULTIPLIER,
  THEORETICAL_SQFT_PER_GALLON,
  type AreaUnit,
  type Porosity,
} from "@/lib/calc/coverage";

export function CoverCalcForm({
  signedIn,
  initialUnit = "sqft",
  jobs = [],
}: {
  signedIn: boolean;
  initialUnit?: AreaUnit;
  jobs?: { id: string; title: string; zip: string | null }[];
}) {
  const t = useTranslations("calc");
  const [unit, setUnit] = useState<AreaUnit>(initialUnit);
  const [area, setArea] = useState(initialUnit === "sqm" ? 110 : 1200);
  const [porosity, setPorosity] = useState<Porosity>("normal");
  const [coats, setCoats] = useState(2);
  const [waste, setWaste] = useState(10);

  const result = useMemo(
    () =>
      calculateCoverage({
        area,
        unit,
        porosity,
        coats,
        wastePercent: waste,
      }),
    [area, unit, porosity, coats, waste],
  );

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div>
          <Label htmlFor="area">{t("area")}</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="area"
              type="number"
              min={1}
              value={area}
              onChange={(e) => setArea(Number(e.target.value))}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={unit}
              onChange={(e) => setUnit(e.target.value as AreaUnit)}
              aria-label={t("area")}
            >
              <option value="sqft">{t("unitSqft")}</option>
              <option value="sqm">{t("unitSqm")}</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="porosity">{t("porosity")}</Label>
          <select
            id="porosity"
            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={porosity}
            onChange={(e) => setPorosity(e.target.value as Porosity)}
          >
            {(Object.keys(POROSITY_MULTIPLIER) as Porosity[]).map((p) => (
              <option key={p} value={p}>
                {t(`porosityOpts.${p}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="coats">{t("coats")}</Label>
          <Input
            id="coats"
            className="mt-2"
            type="number"
            min={1}
            max={6}
            value={coats}
            onChange={(e) => setCoats(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="waste">{t("waste")} (%)</Label>
          <Input
            id="waste"
            className="mt-2"
            type="number"
            min={0}
            max={40}
            value={waste}
            onChange={(e) => setWaste(Number(e.target.value))}
          />
        </div>
      </form>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("result")}</p>
        <p className="score-numeral mt-2 text-5xl font-semibold tracking-tight">
          {t("gallons", { value: result.gallonsRounded.toFixed(1) })}
        </p>
        <p className="mt-1 text-lg text-muted-foreground">
          {t("litres", { value: result.litresRounded.toFixed(1) })}
        </p>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          {t("explain", {
            spread: THEORETICAL_SQFT_PER_GALLON,
            waste,
          })}
        </p>
        <div className="mt-6">
          <SnapshotJobButton
            signedIn={signedIn}
            loginNext="/calc"
            kind="coverage"
            title={`CoverCalc ${result.gallonsRounded.toFixed(1)} gal`}
            payload={{
              area,
              unit,
              porosity,
              coats,
              waste,
              gallons: result.gallonsRounded,
              litres: result.litresRounded,
            }}
            label={signedIn ? t("attach") : t("loginToAttach")}
            jobs={jobs}
          />
        </div>
      </div>
    </div>
  );
}

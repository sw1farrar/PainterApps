"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AddressFields } from "@/components/forms/AddressFields";
import { PhoneInput } from "@/components/forms/PhoneInput";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUpload } from "@/components/storage/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toAddressInput, type AddressFields as AddressValue } from "@/lib/address";
import { ONBOARDING_DEFAULTS } from "@/lib/onboarding/defaults";
import { formatPhoneDisplay } from "@/lib/phone";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import type { Company, QuoteTierName } from "@/types/database";
import {
  saveCompanyInfo,
  savePricingDefaults,
  saveUpgradeRules,
} from "./actions";

const STEPS = ["Company", "Pricing", "Upgrades"] as const;
const TIER_LABELS: Record<QuoteTierName, string> = {
  good: "Good",
  better: "Better",
  best: "Best",
  beautiful: "Beautiful",
};

type OnboardingWizardProps = {
  company: Company | null;
};

export function OnboardingWizard({ company: initialCompany }: OnboardingWizardProps) {
  const router = useRouter();
  const defaults = ONBOARDING_DEFAULTS;
  const envError = getSupabaseEnvError();

  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [companyId, setCompanyId] = React.useState(initialCompany?.id ?? "");
  const [name, setName] = React.useState(initialCompany?.name ?? "");
  const [logoUrl, setLogoUrl] = React.useState(initialCompany?.logo_url ?? "");
  const [addressFields, setAddressFields] = React.useState<AddressValue>({
    address: initialCompany?.address ?? "",
    address_line2: initialCompany?.address_line2 ?? "",
    city: initialCompany?.city ?? "",
    state: initialCompany?.state ?? "",
    zip: initialCompany?.zip ?? "",
  });
  const [phone, setPhone] = React.useState(
    formatPhoneDisplay(initialCompany?.phone),
  );
  const [email, setEmail] = React.useState(initialCompany?.email ?? "");

  const [taxRate, setTaxRate] = React.useState(
    String(initialCompany?.tax_rate ?? defaults.taxRate),
  );
  const [materialMarkup, setMaterialMarkup] = React.useState(
    String(initialCompany?.material_markup ?? defaults.materialMarkup),
  );
  const [overheadPct, setOverheadPct] = React.useState(
    String(initialCompany?.overhead_pct ?? defaults.overheadPct),
  );
  const [coverage, setCoverage] = React.useState(
    String(
      initialCompany?.coverage_sqft_per_gallon ?? defaults.coverageSqftPerGallon,
    ),
  );
  const [painterRate, setPainterRate] = React.useState(
    String(
      (initialCompany?.labor_rates as Record<string, number> | undefined)
        ?.painter ?? defaults.laborRates.painter,
    ),
  );
  const [prepRate, setPrepRate] = React.useState(
    String(
      (initialCompany?.labor_rates as Record<string, number> | undefined)?.prep ??
        defaults.laborRates.prep,
    ),
  );

  const [perGallonPremium, setPerGallonPremium] = React.useState(
    String(defaults.perGallonPremium),
  );
  const [premiumServiceFee, setPremiumServiceFee] = React.useState(
    String(defaults.premiumServiceFee),
  );
  const [tierMultipliers, setTierMultipliers] = React.useState(
    defaults.tierMultipliers,
  );

  async function handleCompanyNext() {
    if (envError) {
      toast.error(envError);
      return;
    }

    setLoading(true);
    const result = await saveCompanyInfo({
      name,
      logoUrl,
      ...toAddressInput(addressFields),
      phone,
      email,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to save company info.");
      return;
    }

    if (result.data?.companyId) {
      setCompanyId(result.data.companyId);
    }

    toast.success("Company info saved.");
    setStep(1);
    router.refresh();
  }

  async function handlePricingNext() {
    if (envError) {
      toast.error(envError);
      return;
    }

    setLoading(true);
    const result = await savePricingDefaults({
      taxRate: Number(taxRate) || 0,
      materialMarkup: Number(materialMarkup) || 0,
      overheadPct: Number(overheadPct) || 0,
      coverageSqftPerGallon: Number(coverage) || 350,
      laborRates: {
        painter: Number(painterRate) || defaults.laborRates.painter,
        prep: Number(prepRate) || defaults.laborRates.prep,
        supervisor: defaults.laborRates.supervisor,
      },
      defaultMargins: defaults.defaultMargins,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to save pricing defaults.");
      return;
    }

    toast.success("Pricing defaults saved.");
    setStep(2);
    router.refresh();
  }

  async function handleFinish() {
    if (envError) {
      toast.error(envError);
      return;
    }

    setLoading(true);
    try {
      const result = await saveUpgradeRules({
        perGallonPremium: Number(perGallonPremium) || 0,
        premiumServiceFee: Number(premiumServiceFee) || 0,
        tierMultipliers,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to complete onboarding.");
      }
    } catch {
      // redirect() throws on success
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo size="md" />
        <h1 className="font-display text-2xl text-white md:text-3xl">
          Set up your company
        </h1>
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <div className="flex gap-2">
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={`h-1.5 w-16 rounded-full transition-colors ${
                index <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {envError ? (
        <Card className="mb-4 border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{envError}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border bg-card/80 backdrop-blur-sm">
        {step === 0 ? (
          <>
            <CardHeader>
              <CardTitle>Company information</CardTitle>
              <CardDescription>
                Tell us about your painting business and upload your company
                logo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Painting Co."
                />
              </div>
              <ImageUpload
                label="Company logo"
                description="Shown in your portal and customer quote pages."
                companyId={companyId}
                currentUrl={logoUrl}
                onUploaded={setLogoUrl}
                onClear={() => setLogoUrl("")}
                uploadDisabled={!companyId}
                uploadDisabledMessage="Click Continue once to create your company, then upload a logo."
              />
              <AddressFields
                idPrefix="onboarding-company"
                value={addressFields}
                onChange={setAddressFields}
                line1Label="Business street address"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <PhoneInput id="phone" value={phone} onChange={setPhone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-contact">Email</Label>
                  <Input
                    id="company-contact"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@company.com"
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleCompanyNext}
                disabled={loading || !name.trim()}
              >
                {loading ? "Saving…" : "Continue"}
              </Button>
            </CardContent>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <CardHeader>
              <CardTitle>Pricing defaults</CardTitle>
              <CardDescription>
                Set baseline rates used when building quotes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="materialMarkup">Material markup (%)</Label>
                  <Input
                    id="materialMarkup"
                    type="number"
                    min="0"
                    step="1"
                    value={materialMarkup}
                    onChange={(e) => setMaterialMarkup(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overheadPct">Overhead (%)</Label>
                  <Input
                    id="overheadPct"
                    type="number"
                    min="0"
                    step="1"
                    value={overheadPct}
                    onChange={(e) => setOverheadPct(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverage">Coverage (sq ft / gallon)</Label>
                  <Input
                    id="coverage"
                    type="number"
                    min="1"
                    step="1"
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="painterRate">Painter rate ($/hr)</Label>
                  <Input
                    id="painterRate"
                    type="number"
                    min="0"
                    step="1"
                    value={painterRate}
                    onChange={(e) => setPainterRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prepRate">Prep rate ($/hr)</Label>
                  <Input
                    id="prepRate"
                    type="number"
                    min="0"
                    step="1"
                    value={prepRate}
                    onChange={(e) => setPrepRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePricingNext}
                  disabled={loading}
                >
                  {loading ? "Saving…" : "Continue"}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <CardHeader>
              <CardTitle>Upgrade rules</CardTitle>
              <CardDescription>
                Configure good-better-best tier multipliers for proposals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="perGallonPremium">Per-gallon premium ($)</Label>
                  <Input
                    id="perGallonPremium"
                    type="number"
                    min="0"
                    step="1"
                    value={perGallonPremium}
                    onChange={(e) => setPerGallonPremium(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="premiumServiceFee">Premium service fee ($)</Label>
                  <Input
                    id="premiumServiceFee"
                    type="number"
                    min="0"
                    step="1"
                    value={premiumServiceFee}
                    onChange={(e) => setPremiumServiceFee(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Tier multipliers</Label>
                {(Object.keys(TIER_LABELS) as QuoteTierName[]).map((tier) => (
                  <div
                    key={tier}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-muted-foreground">
                      {TIER_LABELS[tier]}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.05"
                      className="w-28"
                      value={tierMultipliers[tier]}
                      onChange={(e) =>
                        setTierMultipliers((prev) => ({
                          ...prev,
                          [tier]: Number(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleFinish}
                  disabled={loading}
                >
                  {loading ? "Finishing…" : "Finish setup"}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}
      </Card>
    </div>
  );
}
"use client";

import * as React from "react";
import { toast } from "sonner";

import { AddressFields } from "@/components/forms/AddressFields";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { ImageUpload } from "@/components/storage/ImageUpload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toAddressInput, type AddressFields as AddressValue } from "@/lib/address";
import { ONBOARDING_DEFAULTS } from "@/lib/onboarding/defaults";
import { formatPhoneDisplay } from "@/lib/phone";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import type { Company, QuoteTierName, QuoteUpgradeRules } from "@/types/database";
import {
  updateCompanySettings,
  updatePricingSettings,
  updateUpgradeSettings,
} from "./actions";

const TIER_LABELS: Record<QuoteTierName, string> = {
  good: "Good",
  better: "Better",
  best: "Best",
  beautiful: "Beautiful",
};

type SettingsClientProps = {
  company: Company;
  upgradeRules: QuoteUpgradeRules | null;
};

export function SettingsClient({ company, upgradeRules }: SettingsClientProps) {
  const defaults = ONBOARDING_DEFAULTS;
  const envError = getSupabaseEnvError();
  const [loading, setLoading] = React.useState(false);

  const [name, setName] = React.useState(company.name);
  const [logoUrl, setLogoUrl] = React.useState(company.logo_url ?? "");
  const [addressFields, setAddressFields] = React.useState<AddressValue>({
    address: company.address ?? "",
    address_line2: company.address_line2 ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    zip: company.zip ?? "",
  });
  const [phone, setPhone] = React.useState(formatPhoneDisplay(company.phone));
  const [email, setEmail] = React.useState(company.email ?? "");

  const [taxRate, setTaxRate] = React.useState(String(company.tax_rate));
  const [materialMarkup, setMaterialMarkup] = React.useState(
    String(company.material_markup),
  );
  const [overheadPct, setOverheadPct] = React.useState(
    String(company.overhead_pct),
  );
  const [coverage, setCoverage] = React.useState(
    String(company.coverage_sqft_per_gallon),
  );
  const [painterRate, setPainterRate] = React.useState(
    String(
      (company.labor_rates as Record<string, number>).painter ??
        defaults.laborRates.painter,
    ),
  );
  const [prepRate, setPrepRate] = React.useState(
    String(
      (company.labor_rates as Record<string, number>).prep ??
        defaults.laborRates.prep,
    ),
  );

  const [perGallonPremium, setPerGallonPremium] = React.useState(
    String(upgradeRules?.per_gallon_premium ?? defaults.perGallonPremium),
  );
  const [premiumServiceFee, setPremiumServiceFee] = React.useState(
    String(upgradeRules?.premium_service_fee ?? defaults.premiumServiceFee),
  );
  const [tierMultipliers, setTierMultipliers] = React.useState(
    (upgradeRules?.tier_multipliers as Record<QuoteTierName, number>) ??
      defaults.tierMultipliers,
  );

  async function handleSaveCompany() {
    if (envError) {
      toast.error(envError);
      return;
    }

    setLoading(true);
    const result = await updateCompanySettings({
      name,
      logoUrl,
      ...toAddressInput(addressFields),
      phone,
      email,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to save company settings.");
      return;
    }

    toast.success("Company settings saved.");
  }

  async function handleSavePricing() {
    if (envError) {
      toast.error(envError);
      return;
    }

    setLoading(true);
    const result = await updatePricingSettings({
      taxRate: Number(taxRate) || 0,
      materialMarkup: Number(materialMarkup) || 0,
      overheadPct: Number(overheadPct) || 0,
      coverageSqftPerGallon: Number(coverage) || 350,
      laborRates: {
        painter: Number(painterRate) || defaults.laborRates.painter,
        prep: Number(prepRate) || defaults.laborRates.prep,
        supervisor:
          (company.labor_rates as Record<string, number>).supervisor ??
          defaults.laborRates.supervisor,
      },
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to save pricing.");
      return;
    }

    toast.success("Pricing settings saved.");
  }

  async function handleSaveUpgrades() {
    if (envError) {
      toast.error(envError);
      return;
    }

    setLoading(true);
    const result = await updateUpgradeSettings({
      perGallonPremium: Number(perGallonPremium) || 0,
      premiumServiceFee: Number(premiumServiceFee) || 0,
      tierMultipliers,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to save upgrade rules.");
      return;
    }

    toast.success("Upgrade rules saved.");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="type-eyebrow">Settings</p>
        <h1 className="font-display mt-1 text-2xl text-white md:text-3xl">
          Company settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your logo, pricing defaults, and proposal tiers.
        </p>
      </div>

      {envError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{envError}</p>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Company information</CardTitle>
              <CardDescription>
                Shown on quotes, the customer portal, and your team dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Company name</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <ImageUpload
                label="Company logo"
                companyId={company.id}
                currentUrl={logoUrl}
                onUploaded={setLogoUrl}
                onClear={() => setLogoUrl("")}
              />
              <AddressFields
                idPrefix="settings-company"
                value={addressFields}
                onChange={setAddressFields}
                line1Label="Business street address"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-phone">Phone</Label>
                  <PhoneInput
                    id="settings-phone"
                    value={phone}
                    onChange={setPhone}
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="settings-contact">Email</Label>
                    <Input
                      id="settings-contact"
                      type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSaveCompany} disabled={loading || !name.trim()}>
                {loading ? "Saving…" : "Save company"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Pricing defaults</CardTitle>
              <CardDescription>
                Baseline rates used when building new quotes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-tax">Tax rate (%)</Label>
                  <Input
                    id="settings-tax"
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-markup">Material markup (%)</Label>
                  <Input
                    id="settings-markup"
                    type="number"
                    value={materialMarkup}
                    onChange={(e) => setMaterialMarkup(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-overhead">Overhead (%)</Label>
                  <Input
                    id="settings-overhead"
                    type="number"
                    value={overheadPct}
                    onChange={(e) => setOverheadPct(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-coverage">Coverage (sq ft / gal)</Label>
                  <Input
                    id="settings-coverage"
                    type="number"
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-painter">Painter rate ($/hr)</Label>
                  <Input
                    id="settings-painter"
                    type="number"
                    value={painterRate}
                    onChange={(e) => setPainterRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-prep">Prep rate ($/hr)</Label>
                  <Input
                    id="settings-prep"
                    type="number"
                    value={prepRate}
                    onChange={(e) => setPrepRate(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSavePricing} disabled={loading}>
                {loading ? "Saving…" : "Save pricing"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upgrades">
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Upgrade rules</CardTitle>
              <CardDescription>
                Good-better-best tier multipliers for customer proposals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-premium">Per-gallon premium ($)</Label>
                  <Input
                    id="settings-premium"
                    type="number"
                    value={perGallonPremium}
                    onChange={(e) => setPerGallonPremium(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-fee">Premium service fee ($)</Label>
                  <Input
                    id="settings-fee"
                    type="number"
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
              <Button onClick={handleSaveUpgrades} disabled={loading}>
                {loading ? "Saving…" : "Save upgrades"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
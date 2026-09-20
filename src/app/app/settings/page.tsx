import { getLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { UnitsSwitcher } from "@/components/settings/UnitsSwitcher";
import { CompanyLogoField } from "@/components/settings/CompanyLogoField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { currentAccess } from "@/lib/auth/access";
import { currentUnits } from "@/lib/auth/current-units";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";
import { GrokBotTokens } from "@/components/settings/GrokBotTokens";
import {
  ensureCompany,
  saveCompanySettings,
  saveProductionRates,
} from "../estimates/actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const t = await getTranslations("app");
  const locale = (await getLocale()) as Locale;
  const units = await currentUnits();
  await ensureCompany();
  const userId = await currentUserId();
  const access = await currentAccess();
  const supabase = await createClient();
  let company: {
    company_name: string;
    phone: string;
    hourly_rate: number;
    show_hours_on_proposal: boolean;
    email: string;
    website: string;
    address: string;
    legal_name: string;
    license_number: string;
    insurance_line: string;
    accent_color: string;
    logo_url: string;
    proposal_valid_days: number;
    payment_terms: string;
    exclusions: string;
  } | null = null;
  if (supabase && access?.companyId) {
    const { data: shared } = await supabase
      .from("companies")
      .select(
        "name,phone,hourly_rate,show_hours_on_proposal,email,website,address,legal_name,license_number,insurance_line,accent_color,logo_url,proposal_valid_days,payment_terms,exclusions",
      )
      .eq("id", access.companyId)
      .maybeSingle();
    if (shared) {
      company = {
        company_name: shared.name ?? "",
        phone: shared.phone ?? "",
        hourly_rate: Number(shared.hourly_rate ?? 65),
        show_hours_on_proposal: Boolean(shared.show_hours_on_proposal),
        email: shared.email ?? "",
        website: shared.website ?? "",
        address: shared.address ?? "",
        legal_name: shared.legal_name ?? "",
        license_number: shared.license_number ?? "",
        insurance_line: shared.insurance_line ?? "",
        accent_color: shared.accent_color || "#0f766e",
        logo_url: shared.logo_url ?? "",
        proposal_valid_days: Number(shared.proposal_valid_days ?? 30) || 30,
        payment_terms: shared.payment_terms ?? "",
        exclusions: shared.exclusions ?? "",
      };
    }
  }
  if (!company && userId && supabase) {
    const { data } = await supabase
      .from("company_settings")
      .select("company_name,phone,hourly_rate,show_hours_on_proposal")
      .eq("user_id", userId)
      .maybeSingle();
    company = {
      company_name: data?.company_name ?? "",
      phone: data?.phone ?? "",
      hourly_rate: Number(data?.hourly_rate ?? 65),
      show_hours_on_proposal: Boolean(data?.show_hours_on_proposal),
      email: "",
      website: "",
      address: "",
      legal_name: "",
      license_number: "",
      insurance_line: "",
      accent_color: "#0f766e",
      logo_url: "",
      proposal_valid_days: 30,
      payment_terms: "",
      exclusions: "",
    };
  }
  let ratesQuery = supabase
    ? supabase
        .from("production_rates")
        .select("id,category,name,unit,coats,material_spread_sqft_gal,material_cost_per_gal")
        .order("sort")
    : null;
  if (ratesQuery && access?.companyId) ratesQuery = ratesQuery.eq("company_id", access.companyId);
  else if (ratesQuery && userId) ratesQuery = ratesQuery.eq("user_id", userId);
  const { data: rates } = ratesQuery
    ? await ratesQuery
    : { data: [] as Array<{
        id: string;
        category: string;
        name: string;
        unit: string;
        coats: { 1?: number; 2?: number; 3?: number };
        material_spread_sqft_gal: number | null;
        material_cost_per_gal: number | null;
      }> };
  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("settingsTitle")}
      </h1>
      <section>
        <h2 className="text-sm font-medium">{t("language")}</h2>
        <div className="mt-3">
          <LanguageSwitcher locale={locale} />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-medium">{t("units")}</h2>
        <div className="mt-3">
          <UnitsSwitcher units={units} />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-medium">{t("companyProfile")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("companyProfileHelp")}</p>
        <form action={saveCompanySettings} className="mt-3 space-y-3">
          {access?.companyId ? (
            <CompanyLogoField
              companyId={access.companyId}
              initialUrl={company?.logo_url ?? ""}
            />
          ) : null}
          <Input
            name="company_name"
            placeholder={t("company")}
            defaultValue={company?.company_name ?? ""}
          />
          <Input
            name="legal_name"
            placeholder={t("legalName")}
            defaultValue={company?.legal_name ?? ""}
          />
          <Input name="phone" placeholder={t("phone")} defaultValue={company?.phone ?? ""} />
          <Input
            name="email"
            type="email"
            autoComplete="off"
            placeholder={t("email")}
            defaultValue={company?.email ?? ""}
          />
          <Input
            name="website"
            placeholder={t("website")}
            defaultValue={company?.website ?? ""}
          />
          <Input
            name="address"
            placeholder={t("address")}
            defaultValue={company?.address ?? ""}
          />
          <Input
            name="license_number"
            placeholder={t("licenseNo")}
            defaultValue={company?.license_number ?? ""}
          />
          <Input
            name="insurance_line"
            placeholder={t("insuranceLine")}
            defaultValue={company?.insurance_line ?? ""}
          />
          <label className="block text-sm">
            {t("accentColor")}
            <Input
              name="accent_color"
              type="color"
              defaultValue={company?.accent_color ?? "#0f766e"}
              className="mt-1 h-10 w-20 p-1"
            />
          </label>
          <Input
            name="proposal_valid_days"
            type="number"
            min={1}
            max={365}
            placeholder={t("validDays")}
            defaultValue={company?.proposal_valid_days ?? 30}
          />
          <Textarea
            name="payment_terms"
            placeholder={t("paymentTerms")}
            defaultValue={company?.payment_terms ?? ""}
            rows={3}
          />
          <Textarea
            name="exclusions"
            placeholder={t("exclusions")}
            defaultValue={company?.exclusions ?? ""}
            rows={4}
          />
          <Input
            name="hourly_rate"
            type="number"
            step="0.01"
            placeholder={t("hourlyRate")}
            defaultValue={company?.hourly_rate ?? 65}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="show_hours"
              defaultChecked={Boolean(company?.show_hours_on_proposal)}
            />
            {t("showHours")}
          </label>
          <Button type="submit">{t("saveCompany")}</Button>
        </form>
      </section>
      <section>
        <h2 className="text-sm font-medium">{t("ratesTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("ratesHelp")}</p>
        <form action={saveProductionRates} className="mt-3 space-y-4">
          {(rates ?? []).map((rate) => {
            const coats = (rate.coats ?? {}) as { 1?: number; 2?: number; 3?: number };
            return (
              <div key={rate.id} className="rounded-xl border border-border p-3">
                <input type="hidden" name="rate_id" value={rate.id} />
                <p className="text-sm font-medium">
                  {rate.category}: {rate.name}
                </p>
                <p className="text-xs text-muted-foreground">{rate.unit}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Input
                    name={`coat1_${rate.id}`}
                    type="number"
                    step="0.01"
                    defaultValue={coats[1] ?? ""}
                    aria-label={t("coat1")}
                  />
                  <Input
                    name={`coat2_${rate.id}`}
                    type="number"
                    step="0.01"
                    defaultValue={coats[2] ?? ""}
                    aria-label={t("coat2")}
                  />
                  <Input
                    name={`coat3_${rate.id}`}
                    type="number"
                    step="0.01"
                    defaultValue={coats[3] ?? ""}
                    aria-label={t("coat3")}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    name={`spread_${rate.id}`}
                    type="number"
                    step="0.01"
                    placeholder={t("spread")}
                    defaultValue={rate.material_spread_sqft_gal ?? ""}
                  />
                  <Input
                    name={`cost_${rate.id}`}
                    type="number"
                    step="0.01"
                    placeholder={t("costPerGal")}
                    defaultValue={rate.material_cost_per_gal ?? ""}
                  />
                </div>
              </div>
            );
          })}
          <Button type="submit">{t("saveRates")}</Button>
        </form>
      </section>
      <section>
        <h2 className="text-sm font-medium">{t("grokBot")}</h2>
        <div className="mt-3">
          <GrokBotTokens />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-medium">{t("notifications")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("notificationsSoon")}
        </p>
      </section>
    </div>
  );
}

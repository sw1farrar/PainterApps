import { getLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { CompanyLogoField } from "@/components/settings/CompanyLogoField";
import { GrokBotTokens } from "@/components/settings/GrokBotTokens";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { UnitsSwitcher } from "@/components/settings/UnitsSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AccountEmailForm } from "@/components/settings/AccountEmailForm";
import { currentAccess, hasFeature } from "@/lib/auth/access";
import { currentUnits } from "@/lib/auth/current-units";
import { currentUserEmail, currentUserId } from "@/lib/auth/current-user";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import {
  ensureCompany,
  saveCompanyLogo,
  saveCompanyProfile,
  saveCompanySettings,
  saveProductionRates,
  saveQuoteStyle,
} from "../estimates/actions";
import {
  deleteLocation,
  saveLocation,
  setDefaultLocation,
} from "../locations/actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string }>;
}) {
  const t = await getTranslations("app");
  const locale = (await getLocale()) as Locale;
  const units = await currentUnits();
  await ensureCompany();
  const [{ zip: zipPrefill }, userId, access, loginEmail] = await Promise.all([
    searchParams,
    currentUserId(),
    currentAccess(),
    currentUserEmail(),
  ]);
  const estimatePro = hasFeature(access, "estimate_pro");
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
    quote_style: string;
  } | null = null;
  if (supabase && access?.companyId) {
    const { data: shared } = await supabase
      .from("companies")
      .select(
        "name,phone,hourly_rate,show_hours_on_proposal,email,website,address,legal_name,license_number,insurance_line,accent_color,logo_url,proposal_valid_days,payment_terms,exclusions,quote_style",
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
        quote_style: shared.quote_style === "simple" ? "simple" : "time_based",
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
      quote_style: "time_based",
    };
  }
  const { data: locations } =
    userId && supabase
      ? await supabase
          .from("locations")
          .select("id,label,zip,is_default")
          .order("created_at", { ascending: false })
      : { data: [] };
  let ratesQuery = supabase
    ? supabase
        .from("production_rates")
        .select(
          "id,category,name,unit,coats,material_spread_sqft_gal,material_cost_per_gal",
        )
        .order("sort")
    : null;
  if (ratesQuery && access?.companyId)
    ratesQuery = ratesQuery.eq("company_id", access.companyId);
  else if (ratesQuery && userId) ratesQuery = ratesQuery.eq("user_id", userId);
  const { data: rates } = ratesQuery
    ? await ratesQuery
    : {
        data: [] as Array<{
          id: string;
          category: string;
          name: string;
          unit: string;
          coats: { 1?: number; 2?: number; 3?: number };
          material_spread_sqft_gal: number | null;
          material_cost_per_gal: number | null;
        }>,
      };

  const sections = [
    { id: "account", label: t("sectionAccount") },
    { id: "locations", label: t("locationsTitle") },
    { id: "company", label: t("company") },
    ...(estimatePro ? [{ id: "estimate-pro", label: t("sectionEstimatePro") }] : []),
    { id: "notifications", label: t("notifications") },
  ];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("settingsTitle")}
      </h1>
      <SettingsNav sections={sections} />
      <div className="space-y-10">
        <section id="account" className="scroll-mt-28 space-y-6">
          <div>
            <h2 className="text-sm font-medium">{t("loginEmail")}</h2>
            <div className="mt-3">
              {loginEmail ? <AccountEmailForm email={loginEmail} /> : null}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-medium">{t("language")}</h2>
            <div className="mt-3">
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
          <div>
            <h2 className="text-sm font-medium">{t("units")}</h2>
            <div className="mt-3">
              <UnitsSwitcher units={units} />
            </div>
          </div>
        </section>

        <section id="locations" className="scroll-mt-28">
          <h2 className="text-sm font-medium">{t("locationsTitle")}</h2>
          <form
            action={saveLocation}
            className="mt-3 flex flex-col gap-3 sm:flex-row"
          >
            <Input name="label" placeholder={t("label")} />
            <Input name="zip" placeholder={t("zip")} defaultValue={zipPrefill ?? ""} required />
            <Button type="submit">{t("addLocation")}</Button>
          </form>
          {!locations?.length ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("locationsEmpty")}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
              {locations.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span>
                    {row.label}{" "}
                    <span className="text-muted-foreground">{row.zip}</span>
                    {row.is_default ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t("default")}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex gap-2">
                    {!row.is_default ? (
                      <form
                        action={async () => {
                          "use server";
                          await setDefaultLocation(row.id);
                        }}
                      >
                        <Button type="submit" variant="ghost" size="sm">
                          {t("setDefault")}
                        </Button>
                      </form>
                    ) : null}
                    <form
                      action={async () => {
                        "use server";
                        await deleteLocation(row.id);
                      }}
                    >
                      <Button type="submit" variant="ghost" size="sm">
                        {t("delete")}
                      </Button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="company" className="scroll-mt-28">
          <h2 className="text-sm font-medium">{t("companyProfile")}</h2>
          <form action={saveCompanyProfile} className="mt-3 space-y-3">
            <Input
              name="company_name"
              placeholder={t("company")}
              defaultValue={company?.company_name ?? ""}
            />
            <Input
              name="phone"
              placeholder={t("phone")}
              defaultValue={company?.phone ?? ""}
            />
            <Input
              name="email"
              type="email"
              autoComplete="off"
              placeholder={t("companyEmail")}
              defaultValue={company?.email ?? ""}
              aria-label={t("companyEmail")}
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
            <Button type="submit">{t("saveCompany")}</Button>
          </form>
        </section>

        {estimatePro ? (
          <section id="estimate-pro" className="scroll-mt-28 space-y-8">
            <div>
              <h2 className="text-sm font-medium">{t("quoteStyle")}</h2>
              <form action={saveQuoteStyle} className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="quote_style"
                    value="time_based"
                    defaultChecked={company?.quote_style !== "simple"}
                  />
                  {t("quoteTimeBased")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="quote_style"
                    value="simple"
                    defaultChecked={company?.quote_style === "simple"}
                  />
                  {t("quoteSimple")}
                </label>
                <Button type="submit">{t("saveQuoteStyle")}</Button>
              </form>
            </div>
            <div>
              <h2 className="text-sm font-medium">{t("letterhead")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("companyProfileHelp")}
              </p>
              <form action={saveCompanySettings} className="mt-3 space-y-3">
                {access?.companyId && access.isOwner ? (
                  <CompanyLogoField
                    companyId={access.companyId}
                    initialUrl={company?.logo_url ?? ""}
                  />
                ) : company?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logo_url}
                    alt=""
                    className="h-16 max-w-[10rem] object-contain object-left"
                  />
                ) : null}
                <Input
                  name="legal_name"
                  placeholder={t("legalName")}
                  defaultValue={company?.legal_name ?? ""}
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
            </div>
            <div>
              <h2 className="text-sm font-medium">{t("ratesTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("ratesHelp")}</p>
              <form action={saveProductionRates} className="mt-3 space-y-4">
                {(rates ?? []).map((rate) => {
                  const coats = (rate.coats ?? {}) as {
                    1?: number;
                    2?: number;
                    3?: number;
                  };
                  return (
                    <div
                      key={rate.id}
                      className="rounded-xl border border-border p-3"
                    >
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
            </div>
            <div>
              <h2 className="text-sm font-medium">{t("grokBot")}</h2>
              <div className="mt-3">
                <GrokBotTokens />
              </div>
            </div>
          </section>
        ) : null}

        <section id="notifications" className="scroll-mt-28">
          <h2 className="text-sm font-medium">{t("notifications")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("notificationsSoon")}
          </p>
        </section>
      </div>
    </div>
  );
}

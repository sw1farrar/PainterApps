import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { locales, type Locale, LOCALE_COOKIE } from "./config";
import { localeFromAcceptLanguage } from "./locale";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = locales.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : localeFromAcceptLanguage(headerStore.get("accept-language"));

  const messages = (await import(`./messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    timeZone: "America/Chicago",
  };
});

import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales, type Locale, LOCALE_COOKIE } from "./config";

function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;
  const lowered = header.toLowerCase();
  if (lowered.startsWith("es") || lowered.includes("es-")) return "es";
  return "en";
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = locales.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : parseAcceptLanguage(headerStore.get("accept-language"));

  const messages = (await import(`./messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    timeZone: "America/Chicago",
  };
});

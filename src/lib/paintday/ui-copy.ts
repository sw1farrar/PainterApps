import { getTranslations } from "next-intl/server";
import type {
  HomeMapCopy,
  NavCopy,
  ZipSearchCopy,
} from "@/lib/paintday/copy-types";

export async function navCopy(): Promise<NavCopy> {
  const t = await getTranslations("nav");
  return {
    home: t("home"),
    systems: t("systems"),
    news: t("news"),
    calc: t("calc"),
    app: t("app"),
    login: t("login"),
    signup: t("signup"),
    signOut: t("signOut"),
    language: t("language"),
    theme: t("theme"),
    menu: t("menu"),
    primary: t("primary"),
    skip: t("skip"),
  };
}

export async function zipSearchCopy(): Promise<ZipSearchCopy> {
  const t = await getTranslations("paintday");
  return {
    searchLabel: t("searchLabel"),
    searchPlaceholder: t("searchPlaceholder"),
    searchCta: t("searchCta"),
    invalidZip: t("invalidZip"),
  };
}

export async function homeMapCopy(): Promise<HomeMapCopy> {
  const [landing, paintday] = await Promise.all([
    getTranslations("landing"),
    getTranslations("paintday"),
  ]);
  return {
    mapToday: landing("mapToday"),
    mapTomorrow: landing("mapTomorrow"),
    mapHeading: landing("mapHeading"),
    mapPrevDay: landing("mapPrevDay"),
    mapNextDay: landing("mapNextDay"),
    zip: {
      searchLabel: paintday("searchLabel"),
      searchPlaceholder: paintday("searchPlaceholder"),
      searchCta: paintday("searchCta"),
      invalidZip: paintday("invalidZip"),
    },
    summaries: {
      "excellent-exterior": paintday("summaries.excellent-exterior"),
      "good-exterior": paintday("summaries.good-exterior"),
      "risky-rain": paintday("summaries.risky-rain"),
      "risky-humidity": paintday("summaries.risky-humidity"),
      "risky-temp": paintday("summaries.risky-temp"),
      "risky-dew": paintday("summaries.risky-dew"),
      "risky-wind": paintday("summaries.risky-wind"),
      "risky-freeze": paintday("summaries.risky-freeze"),
      "do-not-paint-rain": paintday("summaries.do-not-paint-rain"),
      "do-not-paint-freeze": paintday("summaries.do-not-paint-freeze"),
      "do-not-paint": paintday("summaries.do-not-paint"),
    },
  };
}

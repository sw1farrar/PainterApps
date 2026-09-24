"use server";

import { getLocale, getMessages } from "next-intl/server";
import { currentUnits } from "@/lib/auth/current-units";
import { currentUserId } from "@/lib/auth/current-user";
import { getZipPaintDay } from "@/lib/paintday/get-zip";
import { isUsZip } from "@/lib/utils";

export async function loadCityForecast(zip: string) {
  if (!isUsZip(zip)) return null;
  const [data, userId, units, locale, messages] = await Promise.all([
    getZipPaintDay(zip),
    currentUserId(),
    currentUnits(),
    getLocale(),
    getMessages(),
  ]);
  if (!data) return null;
  return {
    place: data.place,
    forecast: data.forecast,
    signedIn: Boolean(userId),
    units,
    locale,
    messages,
  };
}

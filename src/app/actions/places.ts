"use server";

import { searchPlaces } from "@/lib/geo/geocode";

export async function searchPlacesAction(query: string) {
  return searchPlaces(query);
}

import { parseGoogleAddressComponents } from "@/lib/address/parse-google-place";
import { getGooglePlacesApiKey } from "@/lib/address/env";
import type { AddressFields } from "@/lib/address";

const PLACES_BASE = "https://places.googleapis.com/v1";

export type AddressSuggestion = {
  placeId: string;
  label: string;
};

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
    };
  }>;
};

type PlaceDetailsResponse = {
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  formattedAddress?: string;
};

function getApiKey(): string {
  const key = getGooglePlacesApiKey();
  if (!key) {
    throw new Error("Address autocomplete is not configured.");
  }
  return key;
}

export async function fetchAddressSuggestions(
  input: string,
  sessionToken?: string,
): Promise<AddressSuggestion[]> {
  const response = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getApiKey(),
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["us"],
      includedPrimaryTypes: ["street_address", "premise", "subpremise"],
      languageCode: "en",
      ...(sessionToken ? { sessionToken } : {}),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Address search failed.");
  }

  const data = (await response.json()) as AutocompleteResponse;

  return (data.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter(Boolean)
    .map((prediction) => ({
      placeId: prediction!.placeId ?? "",
      label: prediction!.text?.text ?? "",
    }))
    .filter((item) => item.placeId && item.label);
}

export async function fetchVerifiedAddress(
  placeId: string,
  sessionToken?: string,
): Promise<AddressFields> {
  const params = new URLSearchParams();
  if (sessionToken) params.set("sessionToken", sessionToken);

  const response = await fetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?${params.toString()}`,
    {
      headers: {
        "X-Goog-Api-Key": getApiKey(),
        "X-Goog-FieldMask": "addressComponents,formattedAddress",
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not load address details.");
  }

  const data = (await response.json()) as PlaceDetailsResponse;
  const parsed = parseGoogleAddressComponents(data.addressComponents ?? []);

  if (!parsed.address?.trim() && data.formattedAddress) {
    const [line1] = data.formattedAddress.split(",");
    return { ...parsed, address: line1?.trim() ?? "" };
  }

  return parsed;
}